<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6">Check-in Data</h1>

    <!-- Filtering and Sorting Options -->
    <div class="bg-white p-4 rounded-lg shadow-md mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label for="filterUser" class="block text-sm font-medium text-gray-700 mb-1">Filter by User ID:</label>
          <input
            type="text"
            id="filterUser"
            v-model="filters.userId"
            placeholder="Enter User ID"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label for="filterDate" class="block text-sm font-medium text-gray-700 mb-1">Filter by Date:</label>
          <input
            type="date"
            id="filterDate"
            v-model="filters.date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label for="sortBy" class="block text-sm font-medium text-gray-700 mb-1">Sort by:</label>
          <select
            id="sortBy"
            v-model="sortBy"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="timestampDesc">Timestamp (Newest First)</option>
            <option value="timestampAsc">Timestamp (Oldest First)</option>
            <option value="userIdAsc">User ID (A-Z)</option>
            <option value="userIdDesc">User ID (Z-A)</option>
          </select>
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button @click="applyFiltersAndSort" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Apply Filters
        </button>
         <button @click="resetFilters" class="ml-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
          Reset Filters
        </button>
      </div>
    </div>

    <!-- Check-in Data Table -->
    <div class="bg-white p-4 rounded-lg shadow-md">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location (Approx.)</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="loading" class="text-center">
            <td colspan="5" class="px-6 py-10 whitespace-nowrap text-sm text-gray-500">Loading check-in data...</td>
          </tr>
          <tr v-else-if="fetchError" class="text-center text-red-500">
            <td colspan="5" class="px-6 py-10 whitespace-nowrap text-sm">Error loading data: {{ fetchError.message }}</td>
          </tr>
          <tr v-else-if="processedCheckIns.length === 0" class="text-center">
            <td colspan="5" class="px-6 py-10 whitespace-nowrap text-sm text-gray-500">No check-in data found for the selected filters.</td>
          </tr>
          <tr v-for="checkIn in processedCheckIns" :key="checkIn.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ checkIn.userId }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(checkIn.timestamp) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ checkIn.ipAddress }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ checkIn.location }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <span :class="getStatusClass(checkIn.status)" class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full">
                {{ checkIn.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Pagination (Simplified) -->
      <div class="mt-4 flex justify-between items-center" v-if="!loading && !fetchError && allCheckIns.length > 0">
        <button 
          @click="prevPage" 
          :disabled="currentPage === 1"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <span class="text-sm text-gray-700">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button 
          @click="nextPage" 
          :disabled="currentPage === totalPages"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

interface CheckInData {
  id: string;
  userId: string;
  timestamp: string; // ISO 8601 date string
  ipAddress: string;
  location: string; // e.g., "City, Country" or "Unknown"
  status: 'Success' | 'Failed' | 'Expired';
}

interface Filters {
  userId: string | null;
  date: string | null; // YYYY-MM-DD
}

// Reactive state
const allCheckIns = ref<CheckInData[]>([]); // Holds all data fetched from API
const filteredCheckIns = ref<CheckInData[]>([]); // Holds filtered and sorted data
const loading = ref(true);
const fetchError = ref<Error | null>(null);

const filters = ref<Filters>({
  userId: null,
  date: null,
});
const sortBy = ref<'timestampDesc' | 'timestampAsc' | 'userIdAsc' | 'userIdDesc'>('timestampDesc');

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(10);

// Methods
const loadCheckInData = async () => {
  loading.value = true;
  fetchError.value = null;
  try {
    // Construct query parameters for backend filtering and sorting if available
    // For now, this example assumes the backend doesn't yet support these and all data is fetched.
    // If backend supports:
    // const params = new URLSearchParams();
    // if (filters.value.userId) params.append('userId', filters.value.userId);
    // if (filters.value.date) params.append('date', filters.value.date);
    // params.append('sortBy', sortBy.value); // e.g., 'timestampDesc'
    // params.append('page', currentPage.value.toString());
    // params.append('limit', itemsPerPage.value.toString());
    // const response = await $fetch<CheckInData[]>(`/api/check-in/data?${params.toString()}`);
    
    const response = await $fetch<CheckInData[]>('/api/check-in/data');
    allCheckIns.value = response; // Assuming API returns the full list for now
    // If backend handles pagination, `response` might be an object like { data: CheckInData[], totalItems: number }
    // and you'd update totalPages and current page based on that.
    
    applyFiltersAndSort(); // This will now filter/sort the data fetched from the API on the client side
  } catch (err: any) {
    console.error('Error fetching check-in data:', err);
    fetchError.value = new Error(err.data?.message || err.message || 'An unknown error occurred while fetching check-in data.');
  } finally {
    loading.value = false;
  }
};

const applyFiltersAndSort = () => {
  // This function is called after data is fetched or when filter/sort criteria change.
  // It performs client-side filtering and sorting on `allCheckIns`.
  currentPage.value = 1; // Reset to first page on new filter/sort
  let result = [...allCheckIns.value];

  // Apply filters
  if (filters.value.userId) {
    result = result.filter(item => item.userId.toLowerCase().includes(filters.value.userId!.toLowerCase()));
  }
  if (filters.value.date) {
    result = result.filter(item => item.timestamp.startsWith(filters.value.date!));
  }

  // Apply sorting
  switch (sortBy.value) {
    case 'timestampAsc':
      result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      break;
    case 'timestampDesc':
      result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      break;
    case 'userIdAsc':
      result.sort((a, b) => a.userId.localeCompare(b.userId));
      break;
    case 'userIdDesc':
      result.sort((a, b) => b.userId.localeCompare(a.userId));
      break;
  }
  filteredCheckIns.value = result;
};

const resetFilters = () => {
    filters.value = { userId: null, date: null };
    sortBy.value = 'timestampDesc'; // Reset to default sort
    applyFiltersAndSort();
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const getStatusClass = (status: CheckInData['status']): string => {
  switch (status) {
    case 'Success':
      return 'bg-green-100 text-green-800';
    case 'Failed':
      return 'bg-red-100 text-red-800';
    case 'Expired':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Computed properties for pagination
const totalPages = computed(() => {
  return Math.ceil(filteredCheckIns.value.length / itemsPerPage.value);
});

const processedCheckIns = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredCheckIns.value.slice(start, end);
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

// Lifecycle hooks
onMounted(() => {
  loadCheckInData();
});
</script>

<style scoped>
.container {
  max-width: 1200px; 
}
/* Additional custom styles if needed */
</style>
