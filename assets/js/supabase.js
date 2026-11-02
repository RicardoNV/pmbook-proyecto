// ==================================================
// Supabase / Cliente compartido para autenticacion
// ==================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Configuracion / Vite carga estos valores desde .env.local.
if (!supabaseUrl || !supabaseKey?.startsWith('sb_publishable_')) {
  throw new Error('Configura la URL y la clave publicable de Supabase en .env.local.');
}

// Una instancia / Los formularios compartiran la misma sesion.
export const supabase = createClient(supabaseUrl, supabaseKey);
