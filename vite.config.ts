import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // This function checks if a module is from a node_modules directory.
          // If it is, it assigns it to a chunk named 'vendor'.
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
});