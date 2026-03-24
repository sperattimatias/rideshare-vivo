import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface MercadoPagoNotification {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  user_id: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
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
    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuración de Supabase no disponible');
    }

    if (!mpAccessToken) {
      throw new Error('MP_ACCESS_TOKEN no configurado');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const notification: MercadoPagoNotification = await req.json();

    console.log('Webhook recibido:', notification);

    if (notification.type !== 'payment') {
      return new Response(
        JSON.stringify({ message: 'Tipo de notificación no procesado' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const paymentId = notification.data.id;

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
        },
      }
    );

    if (!mpResponse.ok) {
      throw new Error('Error al obtener información del pago desde Mercado Pago');
    }

    const paymentData = await mpResponse.json();

    console.log('Datos del pago:', paymentData);

    const tripId = paymentData.external_reference;
    const status = paymentData.status;
    const statusDetail = paymentData.status_detail;

    const { error: updateError } = await supabase
      .from('trip_payments')
      .update({
        mp_status: status,
        mp_status_detail: statusDetail,
        payment_method: paymentData.payment_method_id,
        payment_method_id: paymentData.payment_method_id,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('trip_id', tripId);

    if (updateError) {
      console.error('Error al actualizar pago:', updateError);
      throw updateError;
    }

    console.log(`Pago actualizado: trip_id=${tripId}, status=${status}`);

    if (status === 'approved') {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('driver_id, final_fare')
        .eq('id', tripId)
        .maybeSingle();

      if (!tripError && trip && trip.driver_id) {
        const driverEarnings = trip.final_fare * 0.80;

        const { data: currentDriver } = await supabase
          .from('drivers')
          .select('total_earnings')
          .eq('id', trip.driver_id)
          .maybeSingle();

        if (currentDriver) {
          await supabase
            .from('drivers')
            .update({
              total_earnings: (currentDriver.total_earnings || 0) + driverEarnings,
            })
            .eq('id', trip.driver_id);

          console.log(`Ganancias del conductor actualizadas: +${driverEarnings}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, status }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error en webhook:', error);
    return new Response(
      JSON.stringify({
        error: true,
        message: error.message || 'Error al procesar webhook',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
