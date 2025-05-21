import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'pathe' // Import resolve from pathe

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom', // or 'jsdom'
    setupFiles: ['./vitest.setup.ts'], // Optional: for global test setup
    include: ['**/*.spec.ts'],
    deps: {
      inline: ['nuxt'] // Ensure Nuxt modules are processed by Vitest
    },
  },
  resolve: {
    alias: {
      // Alias to resolve Nuxt specific paths
      '#app': resolve(__dirname, './node_modules/nuxt/dist/app'),
      '#components': resolve(__dirname, './components'),
      // If you have auto-imports from '#imports', you might need to mock them or provide actuals
      // For example, if useFetch is auto-imported:
      // '#imports': resolve(__dirname, './.nuxt/imports.d.ts'), // Adjust path as necessary
      // Or mock specific auto-imports in your setup file or tests
      '@nuxtjs/composition-api': resolve(__dirname, './node_modules/@nuxtjs/composition-api/dist/runtime/index.mjs'), // if you use it
      'vue-router': resolve(__dirname, './node_modules/vue-router/dist/vue-router.mjs'), // if needed explicitly
    },
  },
})
