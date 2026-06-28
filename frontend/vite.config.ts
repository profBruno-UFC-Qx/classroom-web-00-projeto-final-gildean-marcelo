import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main:      resolve(__dirname, 'index.html'),
        login:     resolve(__dirname, 'login.html'),
        cadastro:  resolve(__dirname, 'cadastro.html'),
        carrinho:  resolve(__dirname, 'carrinho.html'),
        status:    resolve(__dirname, 'status.html'),
        perfil:    resolve(__dirname, 'perfil.html'),
      }
    }
  }
});