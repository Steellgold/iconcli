import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/utils/naming.ts',
        'src/utils/validation.ts',
        'src/templates/react.ts',
        'src/templates/vue.ts',
        'src/templates/svelte.ts',
        'src/core/svg-processor.ts',
        'src/core/component-generator.ts',
        'src/config/schema.ts',
        'src/adapters/post-processor.ts',
      ],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'bin/**'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
