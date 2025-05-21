// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },

  // Proxy for API requests
  routeRules: {
    '/api/**': {
      proxy: 'http://localhost:8080/api/**',
    },
  },

  // Optional: If you need to use $fetch on the server-side with the proxy,
  // you might need to configure nitro explicitly, though for client-side $fetch,
  // routeRules should be sufficient.
  // nitro: {
  //   devProxy: {
  //     '/api/': {
  //       target: 'http://localhost:8080/api/',
  //       changeOrigin: true,
  //     },
  //   },
  // },
})
