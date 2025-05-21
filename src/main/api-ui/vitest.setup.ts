import { vi } from 'vitest'

// Mock Nuxt's $fetch
// This mock will be used for all tests unless overridden in a specific test file.
vi.mock('$fetch', () => ({
  default: vi.fn(),
  raw: vi.fn(),
  create: vi.fn(),
}));

// Mock Nuxt composables like useRoute, useRouter, and NuxtLink
// We can provide basic implementations or more specific mocks per test if needed.

vi.mock('#app', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    useRoute: vi.fn(() => ({
      params: {},
      query: {},
      path: '/',
      fullPath: '/',
      hash: '',
      name: undefined,
      meta: {},
      matched: [],
      redirectedFrom: undefined,
    })),
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      go: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      resolve: vi.fn((to) => ({ fullPath: typeof to === 'string' ? to : to.path || '' })),
      options: {},
      currentRoute: { value: { fullPath: '/' } }, // Add currentRoute
      addRoute: vi.fn(),
      getRoutes: vi.fn(() => []),
      hasRoute: vi.fn(() => false),
      removeRoute: vi.fn(),
    })),
    // If NuxtLink is used and needs specific mocking beyond what @vue/test-utils provides
    // with its RouterLink stub, you can add it here.
    // However, @vue/test-utils usually stubs NuxtLink/RouterLink automatically.
  };
});


// Mock NuxtLink component if not handled by default stubs or if specific behavior is needed
// Usually, @vue/test-utils stubs router-link and NuxtLink out of the box.
// If you face issues, you can explicitly mock it:
vi.mock('#components', async (importOriginal) => {
    const original = await importOriginal() as any;
    return {
        ...original,
        NuxtLink: {
            name: 'NuxtLink',
            props: ['to'],
            template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
            // setup(props: { to: string | Record<string, any> }) {
            //     return () => h('a', { href: typeof props.to === 'string' ? props.to : props.to.path }, 'slot');
            // }
        }
    };
});


// You might need to mock other Nuxt-specific features or environment variables
// For example, runtimeConfig:
vi.mock('#imports', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    useRuntimeConfig: vi.fn(() => ({
      public: {},
      app: {},
    })),
    // Mock other auto-imported composables here if needed
    // e.g., useState:
    useState: vi.fn((key, init) => {
        const state = vi.fn(init ? init() : undefined);
        return { value: state() }; // Simplified mock
    }),
  };
});

// Clean up mocks after each test
// import { afterEach } from 'vitest';
// afterEach(() => {
//   vi.clearAllMocks(); // Clears all mocks
//   vi.resetAllMocks(); // Resets all mocks to their initial state (empty mock function)
// });

// If you're using MSW for more complex API mocking, you might initialize it here too.
// import { server } from './__tests__/mocks/server'; // Adjust path to your MSW server setup
// beforeAll(() => server.listen());
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());

console.log('Vitest setup file loaded.');
