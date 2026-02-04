import { defineConfig } from 'vite';

export default defineConfig({
  ssr: {
    noExternal: true, // Bundle everything except external
  },
  build: {
    ssr: true,
    outDir: '../../dist/server',
    emptyOutDir: true,
    lib: {
      entry: 'index.ts',
      formats: ['cjs'],
      fileName: () => 'index.cjs',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
