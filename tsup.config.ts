import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  shims: true,
  splitting: false,
  treeshake: true,
  minify: false,
  sourcemap: false,
  target: 'node18',
});
