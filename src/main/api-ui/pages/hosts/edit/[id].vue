<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Edit Host</h1>

    <div v-if="loading" class="text-center">Loading host details...</div>
    <div v-if="fetchError" class="text-red-500 text-center">
      Error loading host details: {{ fetchError.message }}
    </div>

    <form v-if="host && !loading && !fetchError" @submit.prevent="updateHostHandler" class="bg-white p-6 rounded-lg shadow-md">
      <div class="mb-4">
        <label for="name" class="block text-gray-700 font-semibold mb-2">Host Name</label>
        <input
          type="text"
          id="name"
          v-model="host.name"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      <div class="mb-4">
        <label for="ipAddress" class="block text-gray-700 font-semibold mb-2">IP Address</label>
        <input
          type="text"
          id="ipAddress"
          v-model="host.ipAddress"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          required
          pattern="\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"
          title="Enter a valid IP address (e.g., 192.168.1.1)"
        />
      </div>
      
      <div class="mb-6">
        <label for="status" class="block text-gray-700 font-semibold mb-2">Status</label>
        <select 
          id="status" 
          v-model="host.status"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
          <option value="Pending">Pending</option>
        </select>
      </div>

      <div class="flex justify-end">
        <NuxtLink
          to="/hosts"
          class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
        >
          Cancel
        </NuxtLink>
        <button
          type="submit"
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          :disabled="saving"
        >
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </form>

    <div v-if="saveError" class="mt-4 text-red-500">
      Error saving host: {{ saveError.message }}
    </div>
    <div v-if="saveSuccess" class="mt-4 text-green-500">
      Host updated successfully!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NuxtLink } from '#components';

// Define Host type
interface Host {
  id: string;
  name: string;
  ipAddress: string;
  status: 'Online' | 'Offline' | 'Pending';
}

// Reactive state
const host = ref<Host | null>(null);
const loading = ref(true);
const saving = ref(false);
const fetchError = ref<Error | null>(null);
const saveError = ref<Error | null>(null);
const saveSuccess = ref(false);

const route = useRoute();
const router = useRouter();
const hostId = route.params.id as string;

// Methods
const loadHostDetails = async () => {
  loading.value = true;
  fetchError.value = null;
  try {
    // Assuming the API returns a single Host object
    const fetchedHost = await $fetch<Host>(`/api/hosts/${hostId}`);
    host.value = { ...fetchedHost }; // Create a mutable copy
  } catch (err: any) {
    console.error(`Error fetching host ${hostId}:`, err);
    fetchError.value = new Error(err.data?.message || err.message || `An unknown error occurred while fetching host ${hostId}.`);
  } finally {
    loading.value = false;
  }
};

const updateHostHandler = async () => {
  if (!host.value) return;

  // Basic frontend validation
  if (!host.value.name || !host.value.ipAddress) {
    saveError.value = new Error('Host Name and IP Address are required.');
    return;
  }

  saving.value = true;
  saveError.value = null;
  saveSuccess.value = false;

  try {
    // Assuming the API expects a Host object (or partial) and returns the updated Host
    const updatedHostData = await $fetch<Host>(`/api/hosts/${hostId}`, {
      method: 'PUT',
      body: {
        // Send only the fields that are meant to be updated if API supports PATCH-like behavior with PUT
        // Or send the whole host object if PUT means replace
        name: host.value.name,
        ipAddress: host.value.ipAddress,
        status: host.value.status,
      },
    });
    host.value = updatedHostData; // Update local state with response from API
    saveSuccess.value = true;
    console.log('Host updated successfully:', updatedHostData);

    setTimeout(() => {
      saveSuccess.value = false; // Clear message
      router.push('/hosts'); // Navigate back to the list page
    }, 1500);
  } catch (err: any) {
    console.error('Error updating host:', err);
    saveError.value = new Error(err.data?.message || err.message || 'An unknown error occurred while saving.');
  } finally {
    saving.value = false;
  }
};

// Lifecycle hooks
onMounted(() => {
  loadHostDetails();
});
</script>

<style scoped>
.container {
  max-width: 600px; /* Adjust as needed for form layout */
}
</style>
