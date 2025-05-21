import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import AddPage from '../add.vue'; // Adjust path as necessary

// Explicitly mock $fetch from the global scope
const mockFetch = globalThis.$fetch;

// Mock router
const mockRouterPush = vi.fn();
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRouter: () => ({
      push: mockRouterPush,
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

describe('pages/hosts/add.vue', () => {
  let wrapper;

  beforeEach(() => {
    vi.clearAllMocks(); // Clear mocks before each test

    wrapper = mount(AddPage, {
      global: {
        components: {
          NuxtLink,
        },
        stubs: {
          // NuxtLink: true, // Using the custom mock above for better control if needed
        }
      }
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders the component and displays "Add New Host" title', () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('h1').text()).toBe('Add New Host');
  });

  it('binds input fields to host data', async () => {
    const nameInput = wrapper.find('input#name');
    const ipInput = wrapper.find('input#ipAddress');
    const statusSelect = wrapper.find('select#status');

    await nameInput.setValue('New Server');
    await ipInput.setValue('192.168.1.100');
    await statusSelect.setValue('Online');

    expect(wrapper.vm.host.name).toBe('New Server');
    expect(wrapper.vm.host.ipAddress).toBe('192.168.1.100');
    expect(wrapper.vm.host.status).toBe('Online');
  });

  it('submits the form and calls the API', async () => {
    const hostData = { name: 'Test Host', ipAddress: '10.0.0.1', status: 'Online' };
    const mockApiResponse = { ...hostData, id: 'test-id' };
    (mockFetch as any).mockResolvedValueOnce(mockApiResponse);

    await wrapper.find('input#name').setValue(hostData.name);
    await wrapper.find('input#ipAddress').setValue(hostData.ipAddress);
    await wrapper.find('select#status').setValue(hostData.status);

    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledWith('/api/hosts', {
      method: 'POST',
      body: hostData,
    });
    expect(wrapper.find('.text-green-500').text()).toContain('Host saved successfully!');
    
    // Check for navigation after delay
    // Need to use fake timers if the delay is important to test precisely
    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(1500); // Advance timers by 1.5 seconds
    expect(mockRouterPush).toHaveBeenCalledWith('/hosts');
    vi.useRealTimers();
  });

  it('shows an error message if API call fails', async () => {
    const errorMessage = 'Failed to save host';
    (mockFetch as any).mockRejectedValueOnce({ data: { message: errorMessage } });

    await wrapper.find('input#name').setValue('Error Host');
    await wrapper.find('input#ipAddress').setValue('10.0.0.2');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.find('.text-red-500').text()).toContain(`Error saving host: ${errorMessage}`);
  });
  
  it('shows validation error if host name is missing', async () => {
    await wrapper.find('input#ipAddress').setValue('10.0.0.2');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(wrapper.find('.text-red-500').text()).toContain('Error saving host: Host Name and IP Address are required.');
  });

  it('navigates to "/hosts" when "Cancel" button is clicked', async () => {
    // NuxtLink is stubbed, so we check its 'to' prop
    const cancelLink = wrapper.findComponent(NuxtLink); // Assuming first NuxtLink is Cancel
    expect(cancelLink.props('to')).toBe('/hosts');
    // Actual navigation test would require a mocked router instance and checking router.push,
    // but for NuxtLink, checking 'to' prop is standard for unit tests.
  });
});
