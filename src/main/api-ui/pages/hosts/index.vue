<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Hosts Management</h1>

    <div class="mb-4">
      <NuxtLink to="/hosts/add" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Add Host
      </NuxtLink>
    </div>

    <table class="min-w-full bg-white border border-gray-200">
      <thead>
        <tr>
          <th class="py-2 px-4 border-b">Name</th>
          <th class="py-2 px-4 border-b">IP Address</th>
          <th class="py-2 px-4 border-b">Status</th>
          <th class="py-2 px-4 border-b">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading" class="text-center">
          <td colspan="4" class="py-4">Loading hosts...</td>
        </tr>
        <tr v-else-if="error" class="text-center text-red-500">
          <td colspan="4" class="py-4">Error loading hosts: {{ error.message }}</td>
        </tr>
        <tr v-else-if="hosts.length === 0" class="text-center">
          <td colspan="4" class="py-4">No hosts found.</td>
        </tr>
        <tr v-for="host in hosts" :key="host.id" class="hover:bg-gray-100">
          <td class="py-2 px-4 border-b">{{ host.name }}</td>
          <td class="py-2 px-4 border-b">{{ host.ipAddress }}</td>
          <td class="py-2 px-4 border-b">
            <span :class="getStatusClass(host.status)" class="px-2 py-1 rounded-full text-xs font-semibold">
              {{ host.status }}
            </span>
          </td>
          <td class="py-2 px-4 border-b">
            <NuxtLink :to="`/hosts/edit/${host.id}`" class="text-blue-500 hover:text-blue-700 mr-2">
              Edit
            </NuxtLink>
            <button @click="confirmDelete(host.id)" class="text-red-500 hover:text-red-700">
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteConfirmation" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div class="bg-white p-5 rounded-lg shadow-xl">
        <h3 class="text-lg font-bold mb-4">Confirm Delete</h3>
        <p>Are you sure you want to delete this host?</p>
        <div class="mt-6 flex justify-end">
          <button @click="showDeleteConfirmation = false" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2">
            Cancel
          </button>
          <button @click="deleteHostConfirmed" class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NuxtLink } from '#components'; // Ensure NuxtLink is imported if not auto-imported

// Define Host type
interface Host {
  id: string;
  name: string;
  ipAddress: string;
  status: 'Online' | 'Offline' | 'Pending';
}

// Reactive state
const hosts = ref<Host[]>([]);
const loading = ref(true);
const error = ref<Error | null>(null);
const showDeleteConfirmation = ref(false);
const hostIdToDelete = ref<string | null>(null);

// Methods
const loadHosts = async () => {
  loading.value = true;
  error.value = null;
  try {
    // Assuming the API returns an array of Hosts
    const fetchedHosts = await $fetch<Host[]>('/api/hosts');
    hosts.value = fetchedHosts;
  } catch (err: any) {
    console.error('Error fetching hosts:', err);
    error.value = err.data?.message || err.message || 'An unknown error occurred while fetching hosts.';
    // Ensure error.value is an Error object for consistent handling if needed by other parts of the UI
    if (!(error.value instanceof Error)) {
        error.value = new Error(String(error.value));
    }
  } finally {
    loading.value = false;
  }
};

const confirmDelete = (id: string) => {
  hostIdToDelete.value = id;
  showDeleteConfirmation.value = true;
};

const deleteHostConfirmed = async () => {
  if (!hostIdToDelete.value) return;

  const currentHostId = hostIdToDelete.value; // Store to avoid issues if value changes
  try {
    await $fetch(`/api/hosts/${currentHostId}`, { method: 'DELETE' });
    // Remove host from local list on successful deletion
    hosts.value = hosts.value.filter(host => host.id !== currentHostId);
    console.log(`Host ${currentHostId} deleted successfully.`);
  } catch (err: any) {
    console.error(`Error deleting host ${currentHostId}:`, err);
    // Display error to user, e.g., by setting a specific error ref for delete errors
    alert(`Error deleting host: ${err.data?.message || err.message || 'Unknown error'}`);
  } finally {
    showDeleteConfirmation.value = false;
    hostIdToDelete.value = null;
  }
};

const getStatusClass = (status: Host['status']): string => {
  switch (status) {
    case 'Online':
      return 'bg-green-200 text-green-800';
    case 'Offline':
      return 'bg-red-200 text-red-800';
    case 'Pending':
      return 'bg-yellow-200 text-yellow-800';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

// Lifecycle hooks
onMounted(() => {
  loadHosts();
});
</script>

<style scoped>
/* Scoped styles for the component */
.container {
  max-width: 1024px;
}
</style>
