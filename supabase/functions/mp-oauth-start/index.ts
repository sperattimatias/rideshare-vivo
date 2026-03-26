import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createRequestContext, logError, logInfo } from "../_shared/observability.ts";
import { requireEnv } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OAUTH_STATE_TTL_MINUTES = 10;

function generateSecureState(): string {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);

  return btoa(String.fromCharCode(...random))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

Deno.serve(async (req: Request) => {
  const context = createRequestContext(req, "mp-oauth-start");
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { SUPABASE_URL: supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey } =
      requireEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No autorizado");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Usuario no autenticado");
    }

    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (driverError || !driver) {
      throw new Error("Conductor no encontrado");
    }

    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("key, value")
      .eq("category", "payment")
      .in("key", ["mp_app_id", "mp_environment"]);

    if (settingsError) {
      logError(context, "failed to fetch payment settings", settingsError);
      throw new Error("Error al obtener configuración de Mercado Pago");
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const appId = settingsMap.mp_app_id;
    if (!appId) {
      throw new Error("MP_APP_ID no configurado. Configure la aplicación de Mercado Pago en el panel de administración.");
    }

    const environment = settingsMap.mp_environment || "test";
    const baseUrl = environment === "production"
      ? "https://auth.mercadopago.com.ar"
      : "https://auth.mercadopago.com.ar";

    const redirectUri = `${supabaseUrl}/functions/v1/mp-oauth-callback`;
    const state = generateSecureState();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OAUTH_STATE_TTL_MINUTES);

    const { error: sessionInsertError } = await supabase
      .from("mp_oauth_sessions")
      .insert({
        state,
        driver_id: driver.id,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        metadata: {
          user_agent: req.headers.get("user-agent") || null,
          source: "mp-oauth-start",
        },
      });

    if (sessionInsertError) {
      logError(context, "failed to create oauth session", sessionInsertError, { user_id: user.id, driver_id: driver.id });
      throw new Error("No se pudo iniciar una sesión OAuth segura");
    }

    const { error: linkStartLogError } = await supabase
      .from("driver_mp_linking_logs")
      .insert({
        driver_id: driver.id,
        event_type: "LINK_STARTED",
        metadata: {
          state_prefix: state.slice(0, 8),
          expires_at: expiresAt.toISOString(),
        },
      });

    if (linkStartLogError) {
      logError(context, "failed to insert driver_mp_linking_logs LINK_STARTED", linkStartLogError, { driver_id: driver.id });
    }

    await supabase.from("operational_events").insert({
      domain: "OAUTH",
      action: "OAUTH_LINK_STARTED",
      status: "SUCCESS",
      entity_id: driver.id,
      actor_user_id: user.id,
      metadata: {
        request_id: context.requestId,
        state_prefix: state.slice(0, 8),
      },
    });
    logInfo(context, "oauth link start ready", { driver_id: driver.id });

    const authUrl = new URL(`${baseUrl}/authorization`);
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("platform_id", "mp");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("redirect_uri", redirectUri);

    return new Response(
      JSON.stringify({
        authUrl: authUrl.toString(),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    logError(context, "mp-oauth-start failed", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Error al iniciar OAuth",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
