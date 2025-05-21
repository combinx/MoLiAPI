import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import EditIdPage from '../edit/[id].vue'; // Adjust path as necessary

// Explicitly mock $fetch from the global scope
const mockFetch = globalThis.$fetch;

// Mock router and route
const mockRouterPush = vi.fn();
const mockRouteParams = { id: 'test-host-id' };

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRouter: () => ({
      push: mockRouterPush,
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

// Mock NuxtLink
const NuxtLink = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: typeof props.to === 'string' ? props.to : JSON.stringify(props.to) }, slots.default ? slots.default() : 'NuxtLink');
  }
});

describe('pages/hosts/edit/[id].vue', () => {
  let wrapper;
  const initialHostData = { id: 'test-host-id', name: 'Initial Host', ipAddress: '1.1.1.1', status: 'Online' };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock $fetch for initial data loading
    (mockFetch as any).mockResolvedValueOnce(initialHostData);

    wrapper = mount(EditIdPage, {
      global: {
        components: { NuxtLink },
        // mocks: { $route: { params: { id: 'test-host-id' } } } // useRoute is mocked above
      }
    });
    await flushPromises(); // Wait for initial data load
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders the component and displays "Edit Host" title', () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('h1').text()).toBe('Edit Host');
  });

  it('loads host data into the form on mount', () => {
    expect(mockFetch).toHaveBeenCalledWith(`/api/hosts/${mockRouteParams.id}`);
    expect(wrapper.find('input#name').element.value).toBe(initialHostData.name);
    expect(wrapper.find('input#ipAddress').element.value).toBe(initialHostData.ipAddress);
    expect(wrapper.find('select#status').element.value).toBe(initialHostData.status);
  });

  it('shows loading message initially before data is fetched', async () => {
    (mockFetch as any).mockImplementationOnce(() => new Promise(() => {})); // Pending promise
    const loadingWrapper = mount(EditIdPage, { global: { components: { NuxtLink } } });
    expect(loadingWrapper.find('.text-center').text()).toContain('Loading host details...');
    loadingWrapper.unmount();
  });
  
  it('shows error message if initial data fetching fails', async () => {
    const errorMessage = "Failed to load host";
    (mockFetch as any).mockRejectedValueOnce(new Error(errorMessage));
    const errorWrapper = mount(EditIdPage, { global: { components: { NuxtLink } } });
    await flushPromises();
    expect(errorWrapper.find('.text-red-500.text-center').text()).toContain(`Error loading host details: ${errorMessage}`);
    errorWrapper.unmount();
  });


  it('updates form fields and submits changes', async () => {
    const updatedHostData = { name: 'Updated Host', ipAddress: '2.2.2.2', status: 'Offline' };
    // Mock $fetch for the PUT request
    (mockFetch as any).mockResolvedValueOnce({ id: mockRouteParams.id, ...updatedHostData });

    await wrapper.find('input#name').setValue(updatedHostData.name);
    await wrapper.find('input#ipAddress').setValue(updatedHostData.ipAddress);
    await wrapper.find('select#status').setValue(updatedHostData.status);

    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledWith(`/api/hosts/${mockRouteParams.id}`, {
      method: 'PUT',
      body: updatedHostData,
    });
    expect(wrapper.find('.text-green-500').text()).toContain('Host updated successfully!');

    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(1500);
    expect(mockRouterPush).toHaveBeenCalledWith('/hosts');
    vi.useRealTimers();
  });

  it('shows an error message if updating host fails', async () => {
    const updateErrorMessage = 'Failed to update host';
    (mockFetch as any).mockRejectedValueOnce({ data: { message: updateErrorMessage } });

    await wrapper.find('input#name').setValue('Another Host');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.find('.text-red-500').text()).toContain(`Error saving host: ${updateErrorMessage}`);
  });

  it('shows validation error if host name is missing on submit', async () => {
    await wrapper.find('input#name').setValue('');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockFetch).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: 'PUT' }));
    expect(wrapper.find('.text-red-500').text()).toContain('Error saving host: Host Name and IP Address are required.');
  });

  it('navigates to "/hosts" when "Cancel" button is clicked', () => {
    const cancelLink = wrapper.findComponent(NuxtLink);
    expect(cancelLink.props('to')).toBe('/hosts');
  });
});
