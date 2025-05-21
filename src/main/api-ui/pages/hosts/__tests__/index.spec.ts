import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import IndexPage from '../index.vue'; // Adjust path as necessary

// Explicitly mock $fetch from the global scope
const mockFetch = globalThis.$fetch;

// Mock NuxtLink
const NuxtLink = defineComponent({
  props: ['to'],
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () => h('a', { 
      href: typeof props.to === 'string' ? props.to : JSON.stringify(props.to), 
      onClick: () => emit('click') 
    }, slots.default ? slots.default() : 'NuxtLink');
  }
});

describe('pages/hosts/index.vue', () => {
  let wrapper;

  const mockHosts = [
    { id: '1', name: 'Server A', ipAddress: '192.168.1.10', status: 'Online' },
    { id: '2', name: 'Workstation B', ipAddress: '192.168.1.20', status: 'Offline' },
  ];

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Mock $fetch for successful host loading
    (mockFetch as any).mockResolvedValue(mockHosts);

    wrapper = mount(IndexPage, {
      global: {
        components: {
          NuxtLink,
        },
        mocks: {
          // $fetch is already globally mocked in vitest.setup.ts
          // If specific overrides are needed per test, do it here or with vi.mocked($fetch).mockResolvedValueOnce(...)
        },
        stubs: {
          // Stub NuxtLink if it's not globally mocked or if specific stub behavior is needed
          // NuxtLink: true, // Simple stub
        }
      }
    });

    // Wait for the component to finish its async operations (like data fetching)
    await flushPromises();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders the component and displays "Hosts Management" title', () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('h1').text()).toBe('Hosts Management');
  });

  it('displays hosts correctly when data is loaded', async () => {
    expect(mockFetch).toHaveBeenCalledWith('/api/hosts');
    expect(wrapper.findAll('tbody tr').length).toBe(mockHosts.length);
    expect(wrapper.find('tbody tr:first-child td:first-child').text()).toBe(mockHosts[0].name);
    expect(wrapper.find('tbody tr:last-child td:first-child').text()).toBe(mockHosts[1].name);
  });

  it('shows loading message initially', async () => {
    (mockFetch as any).mockImplementationOnce(() => new Promise(() => {})); // Pending promise
    const loadingWrapper = mount(IndexPage, { global: { components: { NuxtLink } } });
    expect(loadingWrapper.find('tbody tr td[colspan="4"]').text()).toContain('Loading hosts...');
    loadingWrapper.unmount();
  });

  it('shows error message if fetching hosts fails', async () => {
    const errorMessage = 'Network Error';
    (mockFetch as any).mockRejectedValueOnce(new Error(errorMessage));
    const errorWrapper = mount(IndexPage, { global: { components: { NuxtLink } } });
    await flushPromises(); // Wait for the error to be processed
    expect(errorWrapper.find('tbody tr td[colspan="4"].text-red-500').text()).toContain(`Error loading hosts: ${errorMessage}`);
    errorWrapper.unmount();
  });

  it('shows "No hosts found" message if hosts array is empty', async () => {
    (mockFetch as any).mockResolvedValueOnce([]);
    const emptyWrapper = mount(IndexPage, { global: { components: { NuxtLink } } });
    await flushPromises();
    expect(emptyWrapper.find('tbody tr td[colspan="4"]').text()).toContain('No hosts found.');
    emptyWrapper.unmount();
  });

  it('navigates to "Add Host" page when "Add Host" button is clicked', async () => {
    const addHostLink = wrapper.findComponent(NuxtLink); // Assuming first NuxtLink is "Add Host"
    expect(addHostLink.props('to')).toBe('/hosts/add');
    // To test actual navigation, you'd typically check router.push or use a mocked router.
    // Since NuxtLink is stubbed/mocked, we verify the 'to' prop.
  });

  it('navigates to the correct edit page when "Edit" button is clicked', async () => {
    const firstEditLink = wrapper.findAll('tbody tr .text-blue-500').at(0); // First "Edit" NuxtLink
    expect(firstEditLink.exists()).toBe(true);
    // The NuxtLink component is stubbed by default by @vue/test-utils or our custom mock.
    // We check the 'to' prop of the rendered 'a' tag by our mock or the component itself.
    expect(firstEditLink.attributes('href')).toBe(`/hosts/edit/${mockHosts[0].id}`);
  });

  it('shows delete confirmation dialog when "Delete" button is clicked', async () => {
    const deleteButton = wrapper.find('tbody tr:first-child button.text-red-500');
    await deleteButton.trigger('click');
    expect(wrapper.find('.fixed.inset-0').exists()).toBe(true); // Dialog is visible
    expect(wrapper.find('h3.text-lg.font-bold').text()).toBe('Confirm Delete');
  });

  it('closes delete confirmation dialog when "Cancel" is clicked', async () => {
    await wrapper.find('tbody tr:first-child button.text-red-500').trigger('click'); // Open dialog
    await wrapper.find('.bg-gray-300').trigger('click'); // Click Cancel
    expect(wrapper.find('.fixed.inset-0').exists()).toBe(false); // Dialog is hidden
  });

  it('calls delete API and removes host from list when deletion is confirmed', async () => {
    // Mock $fetch for successful deletion
    (mockFetch as any).mockResolvedValueOnce({}); // For the DELETE call

    await wrapper.find('tbody tr:first-child button.text-red-500').trigger('click'); // Open dialog
    await wrapper.find('.bg-red-500').trigger('click'); // Click Delete in dialog

    expect(mockFetch).toHaveBeenCalledWith(`/api/hosts/${mockHosts[0].id}`, { method: 'DELETE' });
    await flushPromises(); // Wait for UI to update
    
    // Check if host is removed from the list
    expect(wrapper.findAll('tbody tr').length).toBe(mockHosts.length - 1);
    expect(wrapper.text()).not.toContain(mockHosts[0].name);
  });

  it('handles error during host deletion', async () => {
    const deleteErrorMessage = 'Failed to delete';
    // Mock $fetch for failed deletion
    (mockFetch as any).mockRejectedValueOnce(new Error(deleteErrorMessage));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    await wrapper.find('tbody tr:first-child button.text-red-500').trigger('click');
    await wrapper.find('.bg-red-500').trigger('click'); // Confirm delete

    expect(mockFetch).toHaveBeenCalledWith(`/api/hosts/${mockHosts[0].id}`, { method: 'DELETE' });
    await flushPromises();

    expect(alertSpy).toHaveBeenCalledWith(`Error deleting host: ${deleteErrorMessage}`);
    // The host should still be in the list as deletion failed
    expect(wrapper.findAll('tbody tr').length).toBe(mockHosts.length); 
    
    alertSpy.mockRestore();
  });
});
