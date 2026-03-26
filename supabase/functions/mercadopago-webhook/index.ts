import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface MercadoPagoNotification {
  type?: string;
  topic?: string;
  action?: string;
  data?: {
    id?: string;
  };
}

function normalizePaymentStatus(status: string): 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled' {
  if (status === 'approved' || status === 'pending' || status === 'rejected' || status === 'refunded' || status === 'cancelled') {
    return status;
  }

  return 'pending';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: setting, error: settingsError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('category', 'payment')
      .eq('key', 'mp_access_token')
      .maybeSingle();

    if (settingsError || !setting?.value) {
      throw new Error('MP_ACCESS_TOKEN no configurado en el sistema');
    }

    const url = new URL(req.url);
    const contentType = req.headers.get('content-type') || '';

    let notification: MercadoPagoNotification = {};
    if (contentType.includes('application/json')) {
      notification = await req.json();
    }

    const notificationType = notification.type || notification.topic || url.searchParams.get('type') || url.searchParams.get('topic');

    if (notificationType !== 'payment') {
      return new Response(JSON.stringify({ message: 'Tipo de notificación no procesado' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentId =
      notification.data?.id ||
      url.searchParams.get('data.id') ||
      url.searchParams.get('id');

    if (!paymentId) {
      return new Response(JSON.stringify({ message: 'Notificación sin payment id' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${setting.value}`,
      },
    });

    if (!mpResponse.ok) {
      throw new Error('Error al obtener información del pago desde Mercado Pago');
    }

    const paymentData = await mpResponse.json();

    const externalReference = paymentData.external_reference as string | null;
    if (!externalReference) {
      return new Response(JSON.stringify({ message: 'Pago sin external_reference' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedStatus = normalizePaymentStatus(paymentData.status || 'pending');

    const { data: processResult, error: processError } = await supabase.rpc('process_trip_payment_webhook', {
      p_external_reference: externalReference,
      p_mp_payment_id: String(paymentData.id),
      p_mp_status: normalizedStatus,
      p_mp_status_detail: paymentData.status_detail || null,
      p_payment_method: paymentData.payment_method_id || null,
      p_payment_method_id: paymentData.payment_method_id || null,
    });

    if (processError) {
      console.error('Error processing webhook in DB:', processError);
      throw new Error('No se pudo aplicar el webhook en base de datos');
    }

    const result = Array.isArray(processResult) ? processResult[0] : processResult;

    if (!result?.processed) {
      return new Response(JSON.stringify({ message: 'No existe pago para external_reference', externalReference }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: result.status,
        status_changed: result.status_changed,
        earnings_applied: result.earnings_applied,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error en webhook:', error);
    return new Response(
      JSON.stringify({
        error: true,
        message: error instanceof Error ? error.message : 'Error al procesar webhook',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
