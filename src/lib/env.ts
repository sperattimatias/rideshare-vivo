import { AppError } from './errors';

interface ClientEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appUrl: string;
}

function requireValue(value: string | undefined, key: string): string {
  if (!value) {
    throw new AppError({
      code: 'ENV_MISSING',
      kind: 'TECHNICAL',
      userMessage: 'Falta configuración de entorno para ejecutar la aplicación.',
      message: `Missing required env var: ${key}`,
    });
  }

  return value;
}

export function getClientEnv(): ClientEnv {
  const supabaseUrl = requireValue(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL');
  const supabaseAnonKey = requireValue(import.meta.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY');
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  return { supabaseUrl, supabaseAnonKey, appUrl };
}
