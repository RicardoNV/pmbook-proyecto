import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// ==================================================
// Vite / Desarrollo y compilacion del frontend
// ==================================================

export default defineConfig(({ mode, command }) => {
  // Publicacion / Evita generar un sitio que no pueda conectar con Supabase.
  const env = loadEnv(mode, process.cwd(), 'VITE_SUPABASE_');
  if (command === 'build') {
    let validUrl = false;
    try { validUrl = new URL(env.VITE_SUPABASE_URL).protocol === 'https:'; } catch { /* Configuracion incompleta. */ }
    if (!validUrl || !env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')) {
      throw new Error('No se puede compilar: configura VITE_SUPABASE_URL (HTTPS) y VITE_SUPABASE_PUBLISHABLE_KEY en .env.local o en el entorno de compilacion. Para Netlify manual, compila localmente y sube la carpeta dist completa.');
    }
  }
  return {
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
  };
});
