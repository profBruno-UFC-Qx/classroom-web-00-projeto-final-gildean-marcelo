import { defineConfig } from 'vite';
import { resolve } from 'path';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {      
      input: {
        // App do Cliente (Mobile)
        main: resolve(__dirname, 'index.html'),
        login:     resolve(__dirname, 'src/pages/user/login.html'),
        cadastro:  resolve(__dirname, 'src/pages/user/cadastro.html'),
        carrinho:  resolve(__dirname, 'src/pages/user/carrinho.html'),
        status:    resolve(__dirname, 'src/pages/user/status.html'),
        perfil:    resolve(__dirname, 'src/pages/user/perfil.html'),

        // App do Admin
        dashboard: resolve(__dirname, 'src/pages/admin/dashboard.html'),
        kds: resolve(__dirname, 'src/pages/admin/kds.html'),
        teamManagement: resolve(__dirname, 'src/pages/admin/team-management.html'),
        orders: resolve(__dirname, 'src/pages/admin/orders.html'),
        cadastroFuncionario: resolve(__dirname, 'src/pages/admin/employee-form.html'),
        menuManagement: resolve(__dirname, 'src/pages/admin/menu-management.html')              
      }
    }
  }
});