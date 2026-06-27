import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // App do Cliente (Mobile)
        main: resolve(__dirname, 'index.html'), 
      }
    }
  }
});