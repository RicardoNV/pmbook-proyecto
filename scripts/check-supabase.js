// ==================================================
// Supabase / Verificacion de conexion sin crear usuarios
// ==================================================

import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), 'VITE_SUPABASE_');
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

try {
  if (!url || !key?.startsWith('sb_publishable_')) {
    throw new Error('Completa la URL y la clave publicable en .env.local.');
  }

  // Lectura / Consulta la configuracion publica de Auth, sin modificarla.
  const response = await fetch(new URL('/auth/v1/settings', url), {
    headers: { apikey: key },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Supabase respondio con HTTP ${response.status}. Revisa el proyecto y la clave.`);
  }

  const settings = await response.json();

  console.log('Conexion con Supabase Auth verificada.');
  console.log(`Acceso por correo: ${settings.external?.email ? 'habilitado' : 'deshabilitado'}.`);
  console.log(`Registro de cuentas: ${settings.disable_signup ? 'deshabilitado' : 'habilitado'}.`);
  console.log(`Confirmacion de correo: ${settings.mailer_autoconfirm === false ? 'requerida' : settings.mailer_autoconfirm === true ? 'no requerida' : 'revisar en el panel'}.`);
} catch (error) {
  console.error(`No se pudo verificar la conexion: ${error.message}`);
  process.exitCode = 1;
}
