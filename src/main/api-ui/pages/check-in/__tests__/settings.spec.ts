import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import SettingsPage from '../settings.vue'; // Adjust path as necessary

// Explicitly mock $fetch from the global scope
const mockFetch = globalThis.$fetch;

// Mock NuxtLink
const NuxtLink = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: typeof props.to === 'string' ? props.to : JSON.stringify(props.to) }, slots.default ? slots.default() : 'NuxtLink');
  }
});

describe('pages/check-in/settings.vue', () => {
  let wrapper;
  const initialSettings = {
    enabled: true,
    duration: 60,
    allowedNetworks: '192.168.1.0/24',
    notificationEmail: 'admin@example.com',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock $fetch for initial settings load
    (mockFetch as any).mockResolvedValue(initialSettings);

    wrapper = mount(SettingsPage, {
      global: {
        components: { NuxtLink },
      }
    });
    await flushPromises(); // Wait for initial data load
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders the component and displays "Check-in Settings" title', () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('h1').text()).toBe('Check-in Settings');
  });

  it('loads initial settings into the form', () => {
    expect(mockFetch).toHaveBeenCalledWith('/api/check-in/settings');
    expect(wrapper.find('input#enableCheckIn').element.checked).toBe(initialSettings.enabled);
    expect(wrapper.find('input#checkInDuration').element.value).toBe(String(initialSettings.duration));
    expect(wrapper.find('input#allowedNetworks').element.value).toBe(initialSettings.allowedNetworks);
    expect(wrapper.find('input#notificationEmail').element.value).toBe(initialSettings.notificationEmail);
  });

  it('disables form fields when check-in system is disabled', async () => {
    await wrapper.find('input#enableCheckIn').setValue(false);
    expect(wrapper.find('input#checkInDuration').element.disabled).toBe(true);
    expect(wrapper.find('input#allowedNetworks').element.disabled).toBe(true);
    expect(wrapper.find('input#notificationEmail').element.disabled).toBe(true);
    expect(wrapper.find('button[type="submit"]').element.disabled).toBe(true);
  });
  
  it('enables form fields when check-in system is enabled', async () => {
    // First disable it
    await wrapper.find('input#enableCheckIn').setValue(false);
    await flushPromises(); 
    // Then enable it again
    await wrapper.find('input#enableCheckIn').setValue(true);
    await flushPromises(); 

    expect(wrapper.find('input#checkInDuration').element.disabled).toBe(false);
    expect(wrapper.find('input#allowedNetworks').element.disabled).toBe(false);
    expect(wrapper.find('input#notificationEmail').element.disabled).toBe(false);
    expect(wrapper.find('button[type="submit"]').element.disabled).toBe(false);
  });

  it('updates settings and submits the form', async () => {
    const newSettings = {
      enabled: true, // Keep it enabled for fields to be active
      duration: 30,
      allowedNetworks: '10.0.0.0/8',
      notificationEmail: 'newadmin@example.com',
    };
    // Mock $fetch for the POST request (saving settings)
    (mockFetch as any).mockResolvedValueOnce(newSettings);

    await wrapper.find('input#checkInDuration').setValue(newSettings.duration);
    await wrapper.find('input#allowedNetworks').setValue(newSettings.allowedNetworks);
    await wrapper.find('input#notificationEmail').setValue(newSettings.notificationEmail);
    // 'enabled' is already true from initial load, or set it explicitly if needed:
    // await wrapper.find('input#enableCheckIn').setValue(newSettings.enabled);

    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledWith('/api/check-in/settings', {
      method: 'POST',
      body: expect.objectContaining(newSettings), // Check if the body contains the new settings
    });
    expect(wrapper.find('.text-green-500').text()).toContain('Settings saved successfully!');
  });

  it('shows an error message if saving settings fails', async () => {
    const saveErrorMessage = 'Failed to save settings';
    (mockFetch as any).mockRejectedValueOnce({ data: { message: saveErrorMessage } });

    await wrapper.find('input#checkInDuration').setValue(45); // Change some data
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.find('.text-red-500').text()).toContain(`Error saving settings: ${saveErrorMessage}`);
  });
  
  it('shows validation error for invalid duration', async () => {
    await wrapper.find('input#checkInDuration').setValue(0); // Invalid duration
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockFetch).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: 'POST' }));
    expect(wrapper.find('.text-red-500').text()).toContain('Error saving settings: Check-in duration must be at least 1 minute.');
  });
  
   it('shows validation error for invalid email if notifications are enabled', async () => {
    await wrapper.find('input#enableCheckIn').setValue(true); // Ensure enabled
    await wrapper.find('input#notificationEmail').setValue('invalid-email');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockFetch).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: 'POST' }));
    expect(wrapper.find('.text-red-500').text()).toContain('Error saving settings: Please enter a valid notification email address.');
  });


  it('navigates to "/" when "Cancel" button is clicked', () => {
    const cancelLink = wrapper.findComponent(NuxtLink);
    expect(cancelLink.props('to')).toBe('/');
  });
});
