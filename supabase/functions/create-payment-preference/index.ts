import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  tripId: string;
}

const PLATFORM_COMMISSION_PERCENT = 20;

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: RequestBody = await req.json();
    const { tripId } = body;

    if (!tripId) {
      return new Response(JSON.stringify({ error: 'tripId es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, passenger_id, driver_id, status, final_fare, origin_address, destination_address')
      .eq('id', tripId)
      .maybeSingle();

    if (tripError || !trip) {
      throw new Error('Viaje no encontrado');
    }

    const { data: passenger, error: passengerError } = await supabase
      .from('passengers')
      .select('id, user_id')
      .eq('id', trip.passenger_id)
      .maybeSingle();

    if (passengerError || !passenger || passenger.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'No autorizado para pagar este viaje' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (trip.status !== 'COMPLETED') {
      throw new Error('Solo se pueden pagar viajes completados');
    }

    if (!trip.driver_id) {
      throw new Error('El viaje no tiene conductor asignado');
    }

    if (!trip.final_fare || trip.final_fare <= 0) {
      throw new Error('El viaje no tiene una tarifa final válida');
    }

    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, mp_seller_id, mp_status, mp_oauth_status')
      .eq('id', trip.driver_id)
      .maybeSingle();

    if (driverError || !driver) {
      throw new Error('Conductor no encontrado');
    }

    if (!driver.mp_seller_id || driver.mp_status !== 'LINKED' || driver.mp_oauth_status !== 'AUTHORIZED') {
      throw new Error('El conductor no tiene una cuenta de Mercado Pago apta para cobrar');
    }

    const { data: existingPayment, error: existingPaymentError } = await supabase
      .from('trip_payments')
      .select('trip_id, mp_status, mp_preference_id, preference_init_point, preference_sandbox_init_point')
      .eq('trip_id', tripId)
      .maybeSingle();

    if (existingPaymentError) {
      throw new Error('No se pudo validar el estado de pago actual');
    }

    if (existingPayment?.mp_status === 'approved') {
      return new Response(JSON.stringify({ error: 'Este viaje ya fue pagado' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (
      existingPayment?.mp_status === 'pending' &&
      existingPayment.preference_init_point &&
      existingPayment.mp_preference_id
    ) {
      return new Response(
        JSON.stringify({
          id: existingPayment.mp_preference_id,
          init_point: existingPayment.preference_init_point,
          sandbox_init_point: existingPayment.preference_sandbox_init_point,
          reused: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: driverToken, error: tokenError } = await supabase
      .from('driver_oauth_tokens')
      .select('access_token, expires_at')
      .eq('driver_id', driver.id)
      .eq('is_active', true)
      .maybeSingle();

    if (tokenError || !driverToken) {
      throw new Error('El conductor no tiene token OAuth activo en Mercado Pago');
    }

    const expiresAt = new Date(driverToken.expires_at);
    if (expiresAt <= new Date()) {
      throw new Error('El token de Mercado Pago del conductor ha expirado');
    }

    const { data: setting, error: settingsError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('category', 'payment')
      .eq('key', 'mp_platform_seller_id')
      .maybeSingle();

    if (settingsError || !setting?.value) {
      throw new Error('MP_PLATFORM_SELLER_ID no configurado');
    }

    const totalAmount = roundCurrency(trip.final_fare);
    const platformAmount = roundCurrency(totalAmount * (PLATFORM_COMMISSION_PERCENT / 100));
    const driverAmount = roundCurrency(totalAmount - platformAmount);

    if (driverAmount <= 0 || platformAmount < 0) {
      throw new Error('No se pudo calcular un split de pago válido');
    }

    const externalReference = `trip:${tripId}`;
    const idempotencyKey = await sha256Hex(`${tripId}|${passenger.user_id}|${totalAmount}|${driver.id}`);

    const appUrl = Deno.env.get('VITE_APP_URL') || 'http://localhost:5173';
    const payerEmail = user.email || 'payer@vivo.local';

    const preferencePayload = {
      items: [
        {
          title: `Viaje VIVO - ${trip.origin_address} → ${trip.destination_address}`,
          quantity: 1,
          unit_price: totalAmount,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: payerEmail,
      },
      back_urls: {
        success: `${appUrl}/payment-success`,
        failure: `${appUrl}/payment-failure`,
        pending: `${appUrl}/payment-pending`,
      },
      auto_return: 'approved' as const,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      external_reference: externalReference,
      marketplace_fee: platformAmount,
      statement_descriptor: 'VIVO',
      metadata: {
        trip_id: tripId,
        passenger_user_id: passenger.user_id,
        driver_id: driver.id,
      },
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${driverToken.access_token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(preferencePayload),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      console.error('Error de Mercado Pago:', errorData);
      throw new Error('Error al crear preferencia en Mercado Pago');
    }

    const mpData = await mpResponse.json();

    const { error: upsertError } = await supabase.from('trip_payments').upsert(
      {
        trip_id: tripId,
        total_amount: totalAmount,
        driver_amount: driverAmount,
        platform_amount: platformAmount,
        mp_payment_id: null,
        mp_preference_id: mpData.id,
        mp_status: 'pending',
        mp_status_detail: null,
        external_reference: externalReference,
        driver_mp_seller_id: driver.mp_seller_id,
        platform_mp_seller_id: setting.value,
        installments: 1,
        idempotency_key: idempotencyKey,
        preference_init_point: mpData.init_point,
        preference_sandbox_init_point: mpData.sandbox_init_point,
      },
      { onConflict: 'trip_id' },
    );

    if (upsertError) {
      console.error('Error al guardar pago:', upsertError);
      throw new Error('Error al registrar la preferencia de pago');
    }

    return new Response(
      JSON.stringify({
        id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error en create-payment-preference:', error);
    return new Response(
      JSON.stringify({
        error: true,
        message: error instanceof Error ? error.message : 'Error al crear preferencia de pago',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
