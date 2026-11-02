import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// ==================================================
// Vite / Desarrollo y compilacion del frontend
// ==================================================

export default defineConfig({
  plugins: [tailwindcss()],

  // Las rutas relativas permiten servir dist desde una subcarpeta.
  base: './',

  // Entradas / Panel y prototipo de inicio de sesion.
  build: {
    rollupOptions: {
      input: {
        dashboard: fileURLToPath(new URL('./index.html', import.meta.url)),
        login: fileURLToPath(new URL('./login.html', import.meta.url)),
      },
    },
  },

  // Servidor de desarrollo / Acceso local.
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },

  // Vista previa de los archivos compilados.
  preview: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
  },
});
