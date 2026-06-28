import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // App do Cliente (Mobile)
        main: resolve(__dirname, 'index.html'),

        // App do Admin   
        kds: resolve(__dirname, 'src/pages/admin/kds.html'),
        teamManagement: resolve(__dirname, 'src/pages/admin/team-management.html'),
        orders: resolve(__dirname, 'src/pages/admin/orders.html'),
        cadastroFuncionario: resolve(__dirname, 'src/pages/admin/employee-form.html'),
        menuManagement: resolve(__dirname, 'src/pages/admin/menu-management.html')
      }
    }
  }
});