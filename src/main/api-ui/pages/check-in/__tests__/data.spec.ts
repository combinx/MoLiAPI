import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
// import { defineComponent, h } from 'vue'; // Not needed for NuxtLink mock here if not used
import DataPage from '../data.vue'; // Adjust path as necessary

// Explicitly mock $fetch from the global scope
const mockFetch = globalThis.$fetch;

// We don't have NuxtLink in this component, so no need to mock it explicitly here.

describe('pages/check-in/data.vue', () => {
  let wrapper;
  const mockCheckInData = [
    { id: '1', userId: 'user123', timestamp: new Date('2023-01-15T10:00:00Z').toISOString(), ipAddress: '192.168.1.100', location: 'New York, USA', status: 'Success' },
    { id: '2', userId: 'user456', timestamp: new Date('2023-01-14T11:00:00Z').toISOString(), ipAddress: '10.0.0.5', location: 'London, UK', status: 'Failed' },
    { id: '3', userId: 'user123', timestamp: new Date('2023-01-16T09:00:00Z').toISOString(), ipAddress: '172.16.0.10', location: 'Berlin, Germany', status: 'Expired' },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock $fetch for initial data load
    (mockFetch as any).mockResolvedValue([...mockCheckInData]); // Return a copy

    wrapper = mount(DataPage, {
      global: {
        // stubs: { NuxtLink: true }, // If NuxtLink were used
      }
    });
    await flushPromises(); // Wait for initial data load & client-side sort
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders the component and displays "Check-in Data" title', () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('h1').text()).toBe('Check-in Data');
  });

  it('loads and displays check-in data', async () => {
    expect(mockFetch).toHaveBeenCalledWith('/api/check-in/data');
    // Default sort is timestampDesc, so item '3' should be first.
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(mockCheckInData.length);
    expect(rows[0].find('td:first-child').text()).toBe(mockCheckInData[2].userId); // user123 (2023-01-16)
    expect(rows[1].find('td:first-child').text()).toBe(mockCheckInData[0].userId); // user123 (2023-01-15)
    expect(rows[2].find('td:first-child').text()).toBe(mockCheckInData[1].userId); // user456 (2023-01-14)
  });

  it('filters data by User ID', async () => {
    await wrapper.find('input#filterUser').setValue('user456');
    await wrapper.find('button.bg-blue-500').trigger('click'); // Apply Filters
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].find('td:first-child').text()).toBe('user456');
  });

  it('filters data by Date', async () => {
    await wrapper.find('input#filterDate').setValue('2023-01-15');
    await wrapper.find('button.bg-blue-500').trigger('click'); // Apply Filters
    await flushPromises();
    
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].find('td:first-child').text()).toBe('user123'); // From 2023-01-15
    expect(rows[0].find('td:nth-child(2)').text()).toContain('January 15, 2023');
  });
  
  it('resets filters', async () => {
    await wrapper.find('input#filterUser').setValue('user456');
    await wrapper.find('button.bg-blue-500').trigger('click'); // Apply Filters
    await flushPromises();
    
    expect(wrapper.findAll('tbody tr').length).toBe(1); // Filtered

    await wrapper.find('button.bg-gray-300').trigger('click'); // Reset Filters
    await flushPromises();

    expect(wrapper.findAll('tbody tr').length).toBe(mockCheckInData.length); // All data shown
    expect(wrapper.find('input#filterUser').element.value).toBe('');
    expect(wrapper.find('input#filterDate').element.value).toBe('');
  });

  it('sorts data by User ID (Ascending)', async () => {
    await wrapper.find('select#sortBy').setValue('userIdAsc');
    await wrapper.find('button.bg-blue-500').trigger('click'); // Apply Filters (which also applies sort)
    await flushPromises();

    const userIds = wrapper.findAll('tbody tr td:first-child').map(td => td.text());
    // Expected: user123, user123, user456 (after sorting by User ID asc)
    expect(userIds).toEqual(['user123', 'user123', 'user456']);
  });
  
  it('sorts data by Timestamp (Oldest First)', async () => {
    await wrapper.find('select#sortBy').setValue('timestampAsc');
    await wrapper.find('button.bg-blue-500').trigger('click');
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    // Expected: user456 (01-14), user123 (01-15), user123 (01-16)
    expect(rows[0].find('td:first-child').text()).toBe(mockCheckInData[1].userId); // user456 (2023-01-14)
    expect(rows[1].find('td:first-child').text()).toBe(mockCheckInData[0].userId); // user123 (2023-01-15)
    expect(rows[2].find('td:first-child').text()).toBe(mockCheckInData[2].userId); // user123 (2023-01-16)
  });

  it('shows "No check-in data found" message for empty filtered results', async () => {
    await wrapper.find('input#filterUser').setValue('nonexistentuser');
    await wrapper.find('button.bg-blue-500').trigger('click');
    await flushPromises();

    expect(wrapper.find('tbody tr td[colspan="5"]').text()).toContain('No check-in data found for the selected filters.');
  });
  
  it('handles API error when fetching data', async () => {
    const errorMessage = "API is down";
    (mockFetch as any).mockRejectedValueOnce(new Error(errorMessage));
    
    // Need to mount a new wrapper because the initial fetch is in onMounted
    const errorWrapper = mount(DataPage);
    await flushPromises();

    expect(errorWrapper.find('tbody tr td[colspan="5"].text-red-500').text()).toContain(`Error loading data: ${errorMessage}`);
    errorWrapper.unmount();
  });

  // Pagination tests (simplified due to client-side pagination)
  describe('Pagination', () => {
    const manyItems = Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      userId: `user${i + 1}`,
      timestamp: new Date(2023, 0, i + 1).toISOString(),
      ipAddress: `192.168.0.${i + 1}`,
      location: 'Test Location',
      status: 'Success' as 'Success' | 'Failed' | 'Expired',
    }));

    beforeEach(async () => {
      vi.clearAllMocks();
      (mockFetch as any).mockResolvedValue([...manyItems]); // More items for pagination
      wrapper = mount(DataPage);
      await flushPromises();
    });

    it('displays 10 items per page by default', () => {
      expect(wrapper.findAll('tbody tr').length).toBe(10);
      expect(wrapper.find('.text-sm.text-gray-700').text()).toContain('Page 1 of 3'); // 25 items / 10 per page = 3 pages
    });

    it('navigates to the next page', async () => {
      await wrapper.find('button:contains(Next)').trigger('click');
      await flushPromises();
      expect(wrapper.find('.text-sm.text-gray-700').text()).toContain('Page 2 of 3');
      expect(wrapper.findAll('tbody tr').length).toBe(10);
      expect(wrapper.find('tbody tr:first-child td:first-child').text()).toBe('user11'); // Default sort is timestampDesc
    });

    it('disables "Previous" button on first page and "Next" button on last page', async () => {
      expect(wrapper.find('button:contains(Previous)').attributes('disabled')).toBeDefined();
      
      await wrapper.find('button:contains(Next)').trigger('click'); // Page 2
      await wrapper.find('button:contains(Next)').trigger('click'); // Page 3
      await flushPromises();

      expect(wrapper.find('.text-sm.text-gray-700').text()).toContain('Page 3 of 3');
      expect(wrapper.find('button:contains(Next)').attributes('disabled')).toBeDefined();
      expect(wrapper.find('button:contains(Previous)').attributes('disabled')).toBeUndefined();
    });
  });
});
