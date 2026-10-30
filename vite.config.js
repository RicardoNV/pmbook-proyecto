import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// ==================================================
// Vite / Desarrollo y compilacion del frontend
// ==================================================

export default defineConfig({
  plugins: [tailwindcss()],

  // Las rutas relativas permiten servir dist desde una subcarpeta.
  base: './',

  // Servidor de desarrollo / Acceso local.
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },

  // Vista previa de los archivos compilados.
  preview: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
  },
});
