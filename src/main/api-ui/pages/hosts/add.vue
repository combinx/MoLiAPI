<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Add New Host</h1>

    <form @submit.prevent="saveHost" class="bg-white p-6 rounded-lg shadow-md">
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
          {{ saving ? 'Saving...' : 'Save Host' }}
        </button>
      </div>
    </form>

    <div v-if="error" class="mt-4 text-red-500">
      Error saving host: {{ error.message }}
    </div>
     <div v-if="saveSuccess" class="mt-4 text-green-500">
      Host saved successfully!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NuxtLink } from '#components';

// Define Host type (can be shared in a types file later)
interface NewHost {
  name: string;
  ipAddress: string;
  status: 'Online' | 'Offline' | 'Pending';
}

// Reactive state
const host = ref<NewHost>({
  name: '',
  ipAddress: '',
  status: 'Pending', // Default status
});
const saving = ref(false);
const error = ref<Error | null>(null);
const saveSuccess = ref(false);

const router = useRouter();

// Methods
const saveHost = async () => {
  saving.value = true;
  error.value = null;
  saveSuccess.value = false;

  // Basic frontend validation (though HTML5 'required' and 'pattern' are already in use)
  if (!host.value.name || !host.value.ipAddress) {
    error.value = new Error('Host Name and IP Address are required.');
    saving.value = false;
    return;
  }
  // IP Address pattern is handled by the input's pattern attribute.
  // More complex validation could be added here if needed.

  try {
    // Assuming the API expects a NewHost object and returns the created Host (possibly with an ID)
    const newHost = await $fetch<NewHost & { id: string }>('/api/hosts', {
      method: 'POST',
      body: host.value,
    });
    console.log('Host saved successfully:', newHost);
    saveSuccess.value = true;
    
    // Reset form after successful submission
    host.value = { name: '', ipAddress: '', status: 'Pending' }; 

    setTimeout(() => {
      saveSuccess.value = false; // Clear success message
      router.push('/hosts'); // Navigate back to the list page
    }, 1500); // Delay for user to see success message
  } catch (err: any) {
    console.error('Error saving host:', err);
    error.value = new Error(err.data?.message || err.message || 'An unknown error occurred while saving.');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.container {
  max-width: 600px; /* Adjust as needed for form layout */
}
</style>
