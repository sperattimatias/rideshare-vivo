import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createRequestContext, logError, logInfo } from "../_shared/observability.ts";
import { requireEnv } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function htmlError(message: string, status = 500): Response {
  return new Response(
    `<!DOCTYPE html>
      <html>
        <head>
          <title>Error de Conexión</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #e74c3c; }
            p { color: #555; margin: 20px 0; }
            button { background: #3498db; color: white; border: none; padding: 12px 30px; border-radius: 5px; cursor: pointer; font-size: 16px; }
            button:hover { background: #2980b9; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Error de Conexión</h1>
            <p>Hubo un problema al conectar tu cuenta de Mercado Pago.</p>
            <p>${message}</p>
            <button onclick="window.close()">Cerrar</button>
          </div>
        </body>
      </html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}

Deno.serve(async (req: Request) => {
  const context = createRequestContext(req, "mp-oauth-callback");
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { SUPABASE_URL: supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey } =
      requireEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return htmlError(`Error: ${error}`, 400);
    }

    if (!code || !state) {
      throw new Error("Código o estado no proporcionado");
    }

    const { data: oauthSession, error: consumeSessionError } = await supabase
      .from("mp_oauth_sessions")
      .update({ consumed_at: new Date().toISOString() })
      .eq("state", state)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("id, driver_id, user_id")
      .maybeSingle();

    if (consumeSessionError) {
      logError(context, "failed to consume oauth session", consumeSessionError, { state_prefix: state.slice(0, 8) });
      throw new Error("No se pudo validar la sesión OAuth");
    }

    if (!oauthSession) {
      throw new Error("Sesión OAuth inválida, expirada o ya utilizada");
    }

    const driverId = oauthSession.driver_id;

    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id, user_id")
      .eq("id", driverId)
      .maybeSingle();

    if (driverError || !driver) {
      throw new Error("Conductor no encontrado para la sesión OAuth");
    }

    if (driver.user_id !== oauthSession.user_id) {
      await supabase
        .from("driver_mp_linking_logs")
        .insert({
          driver_id: driverId,
          event_type: "LINK_FAILED",
          error_message: "Inconsistencia entre sesión OAuth y conductor",
          metadata: { oauth_session_id: oauthSession.id },
        });

      throw new Error("Inconsistencia de sesión OAuth detectada");
    }

    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("key, value")
      .eq("category", "payment")
      .in("key", ["mp_app_id", "mp_client_secret", "mp_environment"]);

    if (settingsError) {
      logError(context, "failed to fetch payment settings", settingsError);
      throw new Error("Error al obtener configuración");
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const appId = settingsMap.mp_app_id;
    const clientSecret = settingsMap.mp_client_secret;

    if (!appId || !clientSecret) {
      throw new Error("Credenciales de Mercado Pago no configuradas");
    }

    const environment = settingsMap.mp_environment || "test";
    const baseUrl = environment === "production"
      ? "https://api.mercadopago.com"
      : "https://api.mercadopago.com";

    const redirectUri = `${supabaseUrl}/functions/v1/mp-oauth-callback`;

    const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: appId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      logError(context, "token exchange failed", new Error("MP_TOKEN_EXCHANGE_ERROR"), { response_body: errorData, response_status: tokenResponse.status });

      await supabase
        .from("driver_mp_linking_logs")
        .insert({
          driver_id: driverId,
          event_type: "LINK_FAILED",
          error_message: "Error al obtener token de acceso",
          metadata: {
            oauth_session_id: oauthSession.id,
            response_status: tokenResponse.status,
          },
        });

      throw new Error("Error al obtener token de acceso");
    }

    const tokenData = await tokenResponse.json();

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 15552000));

    const { error: revokeError } = await supabase
      .from("driver_oauth_tokens")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq("driver_id", driverId)
      .eq("is_active", true);

    if (revokeError) {
      logError(context, "failed to revoke old tokens", revokeError, { driver_id: driverId });
    }

    const { error: insertError } = await supabase
      .from("driver_oauth_tokens")
      .insert({
        driver_id: driverId,
        mp_user_id: tokenData.user_id.toString(),
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || "Bearer",
        expires_at: expiresAt.toISOString(),
        scope: tokenData.scope,
        public_key: tokenData.public_key,
        is_active: true,
      });

    if (insertError) {
      logError(context, "failed to persist oauth token", insertError, { driver_id: driverId });
      throw new Error("Error al guardar token de acceso");
    }

    const { error: updateDriverError } = await supabase
      .from("drivers")
      .update({
        mp_seller_id: tokenData.user_id.toString(),
        mp_oauth_status: "AUTHORIZED",
        mp_oauth_connected_at: new Date().toISOString(),
        mp_status: "LINKED",
        mp_linked_at: new Date().toISOString(),
      })
      .eq("id", driverId);

    if (updateDriverError) {
      logError(context, "failed to update driver oauth status", updateDriverError, { driver_id: driverId });
      throw new Error("Error al actualizar conductor");
    }

    const { error: linkLogError } = await supabase
      .from("driver_mp_linking_logs")
      .insert({
        driver_id: driverId,
        event_type: "LINK_SUCCESS",
        mp_seller_id: tokenData.user_id.toString(),
        metadata: {
          oauth_session_id: oauthSession.id,
        },
      });

    if (linkLogError) {
      logError(context, "failed to persist link success history", linkLogError, { driver_id: driverId });
    }

    await supabase.from("operational_events").insert({
      domain: "OAUTH",
      action: "OAUTH_LINK_COMPLETED",
      status: "SUCCESS",
      entity_id: driverId,
      actor_user_id: oauthSession.user_id,
      metadata: {
        request_id: context.requestId,
        oauth_session_id: oauthSession.id,
      },
    });
    logInfo(context, "oauth link completed", { driver_id: driverId });

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Conexión Exitosa</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: white;
              padding: 50px;
              border-radius: 20px;
              max-width: 500px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            .checkmark {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              display: block;
              stroke-width: 3;
              stroke: #4caf50;
              stroke-miterlimit: 10;
              margin: 10px auto 30px;
              box-shadow: inset 0px 0px 0px #4caf50;
              animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
            }
            .checkmark__circle {
              stroke-dasharray: 166;
              stroke-dashoffset: 166;
              stroke-width: 3;
              stroke-miterlimit: 10;
              stroke: #4caf50;
              fill: none;
              animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }
            .checkmark__check {
              transform-origin: 50% 50%;
              stroke-dasharray: 48;
              stroke-dashoffset: 48;
              animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
            }
            @keyframes stroke {
              100% { stroke-dashoffset: 0; }
            }
            @keyframes scale {
              0%, 100% { transform: none; }
              50% { transform: scale3d(1.1, 1.1, 1); }
            }
            @keyframes fill {
              100% { box-shadow: inset 0px 0px 0px 40px #4caf50; }
            }
            h1 {
              color: #2c3e50;
              margin: 20px 0;
              font-size: 28px;
              font-weight: 600;
            }
            p {
              color: #7f8c8d;
              margin: 15px 0;
              font-size: 16px;
              line-height: 1.6;
            }
            .info-box {
              background: #f8f9fa;
              border-left: 4px solid #4caf50;
              padding: 15px;
              margin: 25px 0;
              border-radius: 5px;
              text-align: left;
            }
            .info-box strong {
              color: #2c3e50;
              display: block;
              margin-bottom: 5px;
            }
            button {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 15px 40px;
              border-radius: 25px;
              cursor: pointer;
              font-size: 16px;
              font-weight: 600;
              margin-top: 20px;
              transition: transform 0.2s, box-shadow 0.2s;
              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            button:active {
              transform: translateY(0);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
              <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <h1>¡Cuenta Conectada!</h1>
            <p>Tu cuenta de Mercado Pago se ha vinculado exitosamente.</p>
            <div class="info-box">
              <strong>✓ Ahora podés recibir pagos</strong>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Los pagos de tus viajes se acreditarán automáticamente en tu cuenta de Mercado Pago.</p>
            </div>
            <p style="font-size: 14px; color: #95a5a6;">Podés cerrar esta ventana y volver a la aplicación.</p>
            <button onclick="window.close()">Cerrar Ventana</button>
            <script>
              setTimeout(() => {
                if (window.opener) {
                  window.opener.postMessage({ type: 'MP_OAUTH_SUCCESS' }, '*');
                }
              }, 1000);
            </script>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      },
    );
  } catch (error) {
    logError(context, "mp-oauth-callback failed", error);
    return htmlError(error instanceof Error ? error.message : "Error desconocido", 500);
  }
});
