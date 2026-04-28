import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.jest.test.ts'],
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
});
