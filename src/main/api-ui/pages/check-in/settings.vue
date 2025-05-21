<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6">Check-in Settings</h1>

    <form @submit.prevent="saveSettingsHandler" class="bg-white p-6 rounded-lg shadow-md max-w-2xl">
      <div class="mb-6">
        <label for="enableCheckIn" class="flex items-center cursor-pointer">
          <input
            type="checkbox"
            id="enableCheckIn"
            v-model="settings.enabled"
            class="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span class="ml-3 text-gray-700 font-semibold">Enable Check-in System</span>
        </label>
      </div>

      <div class="mb-6">
        <label for="checkInDuration" class="block text-gray-700 font-semibold mb-2">
          Check-in Duration (minutes)
        </label>
        <input
          type="number"
          id="checkInDuration"
          v-model.number="settings.duration"
          min="1"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          :disabled="!settings.enabled"
        />
        <p v-if="!settings.enabled" class="text-xs text-gray-500 mt-1">
          Enable check-in system to set duration.
        </p>
      </div>

      <div class="mb-6">
        <label for="allowedNetworks" class="block text-gray-700 font-semibold mb-2">
          Allowed IP Addresses/Ranges (comma-separated)
        </label>
        <input
          type="text"
          id="allowedNetworks"
          v-model="settings.allowedNetworks"
          placeholder="e.g., 192.168.1.0/24, 10.0.0.1"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          :disabled="!settings.enabled"
        />
         <p v-if="!settings.enabled" class="text-xs text-gray-500 mt-1">
          Enable check-in system to configure allowed networks.
        </p>
      </div>
      
      <div class="mb-6">
        <label for="notificationEmail" class="block text-gray-700 font-semibold mb-2">
          Notification Email for Failed Check-ins
        </label>
        <input
          type="email"
          id="notificationEmail"
          v-model="settings.notificationEmail"
          placeholder="admin@example.com"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          :disabled="!settings.enabled"
        />
         <p v-if="!settings.enabled" class="text-xs text-gray-500 mt-1">
          Enable check-in system to set notification email.
        </p>
      </div>

      <div class="flex justify-end">
        <NuxtLink
          to="/" 
          class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
        >
          Cancel
        </NuxtLink>
        <button
          type="submit"
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          :disabled="saving || !settings.enabled"
        >
          {{ saving ? 'Saving...' : 'Save Settings' }}
        </button>
      </div>
    </form>

    <div v-if="fetchError" class="mt-4 text-red-500">
      Error loading settings: {{ fetchError.message }}
    </div>
    <div v-if="saveError" class="mt-4 text-red-500">
      Error saving settings: {{ saveError.message }}
    </div>
    <div v-if="saveSuccess" class="mt-4 text-green-500">
      Settings saved successfully!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { NuxtLink } from '#components';

interface CheckInSettings {
  enabled: boolean;
  duration: number; // in minutes
  allowedNetworks: string; // comma-separated IPs or CIDR
  notificationEmail: string;
}

// Reactive state
const settings = ref<CheckInSettings>({
  enabled: false,
  duration: 60,
  allowedNetworks: '',
  notificationEmail: '',
});

const loading = ref(true);
const saving = ref(false);
const fetchError = ref<Error | null>(null);
const saveError = ref<Error | null>(null);
const saveSuccess = ref(false);

// Methods
const loadSettings = async () => {
  loading.value = true;
  fetchError.value = null;
  try {
    const data = await $fetch<CheckInSettings>('/api/check-in/settings');
    settings.value = data;
  } catch (err: any) {
    console.error('Error fetching check-in settings:', err);
    fetchError.value = new Error(err.data?.message || err.message || 'An unknown error occurred while fetching settings.');
  } finally {
    loading.value = false;
  }
};

const saveSettingsHandler = async () => {
  saving.value = true;
  saveError.value = null;
  saveSuccess.value = false;

  // Basic Frontend Validation
  if (settings.value.enabled) {
    if (settings.value.duration < 1) {
      saveError.value = new Error('Check-in duration must be at least 1 minute.');
      saving.value = false;
      return;
    }
    if (!settings.value.notificationEmail && settings.value.enabled) { // Check if enabled, as it might be optional otherwise
        // Basic email format check (not exhaustive)
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (settings.value.notificationEmail && !emailPattern.test(settings.value.notificationEmail)) {
            saveError.value = new Error('Please enter a valid notification email address.');
            saving.value = false;
            return;
        }
    }
    // Allowed networks might have more complex validation (e.g., CIDR format)
    // For now, we'll rely on backend validation for this field's specifics.
  }


  try {
    // Assuming the API expects a CheckInSettings object and returns the saved/updated settings
    const savedData = await $fetch<CheckInSettings>('/api/check-in/settings', {
      method: 'POST', // Or 'PUT' if the endpoint is designed for update-or-create
      body: settings.value,
    });
    settings.value = savedData; // Update local state with response from API
    saveSuccess.value = true;
    console.log('Check-in settings saved successfully:', savedData);
    setTimeout(() => {
      saveSuccess.value = false; // Hide message after a few seconds
    }, 3000);
  } catch (err: any) {
    console.error('Error saving check-in settings:', err);
    saveError.value = new Error(err.data?.message || err.message || 'An unknown error occurred while saving settings.');
  } finally {
    saving.value = false;
  }
};

// Watch for changes in the enabled status to clear/reset dependent fields if needed
watch(() => settings.value.enabled, (isEnabled) => {
  if (!isEnabled) {
    // Optionally clear or reset fields when check-in is disabled
    // settings.value.duration = 60; // Reset to default
    // settings.value.allowedNetworks = '';
    // settings.value.notificationEmail = '';
    console.log('Check-in system disabled. Dependent fields are now disabled but retain their values.');
  }
});

// Lifecycle hooks
onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.container {
  max-width: 800px; 
}
.form-checkbox {
  appearance: none;
  padding: 0;
  print-color-adjust: exact;
  display: inline-block;
  vertical-align: middle;
  background-origin: border-box;
  user-select: none;
  flex-shrink: 0;
  height: 1.25rem; /* h-5 */
  width: 1.25rem; /* w-5 */
  color: #2563eb; /* text-blue-600 */
  background-color: #fff;
  border-color: #6b7280; /* border-gray-500 or similar */
  border-width: 1px;
  border-radius: 0.375rem; /* rounded */
}
.form-checkbox:checked {
  background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
  border-color: transparent;
  background-color: currentColor;
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
}
.form-checkbox:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
  --tw-ring-inset: var(--tw-empty,/*!*/ /*!*/);
  --tw-ring-offset-width: 2px;
  --tw-ring-offset-color: #fff;
  --tw-ring-color: #3b82f6; /* ring-blue-500 */
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}
</style>
