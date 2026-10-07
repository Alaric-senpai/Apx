import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  // Bundle internal workspace packages into the CLI binary
  noExternal: [
    '@apx/commands',
    '@apx/core',
    '@apx/types',
    '@apx/utils',
  ],
  sourcemap: true,
  dts: false,
  splitting: false,
});
