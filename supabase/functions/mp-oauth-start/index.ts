import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuración de Supabase no disponible');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No autorizado');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Usuario no autenticado');
    }

    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (driverError || !driver) {
      throw new Error('Conductor no encontrado');
    }

    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('key, value')
      .eq('category', 'payment')
      .in('key', ['mp_app_id', 'mp_environment']);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw new Error('Error al obtener configuración de Mercado Pago');
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const appId = settingsMap.mp_app_id;
    if (!appId) {
      throw new Error('MP_APP_ID no configurado. Configure la aplicación de Mercado Pago en el panel de administración.');
    }

    const environment = settingsMap.mp_environment || 'test';
    const baseUrl = environment === 'production'
      ? 'https://auth.mercadopago.com.ar'
      : 'https://auth.mercadopago.com.ar';

    const redirectUri = `${supabaseUrl}/functions/v1/mp-oauth-callback`;

    const state = `${driver.id}|${Date.now()}`;

    const authUrl = new URL(`${baseUrl}/authorization`);
    authUrl.searchParams.set('client_id', appId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('platform_id', 'mp');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('redirect_uri', redirectUri);

    return new Response(
      JSON.stringify({
        authUrl: authUrl.toString(),
        state: state,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in mp-oauth-start:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error al iniciar OAuth',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
