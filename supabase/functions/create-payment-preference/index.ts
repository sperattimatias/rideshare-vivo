import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  tripId: string;
  amount: number;
  driverAmount: number;
  platformAmount: number;
  driverSellerId: string;
  description: string;
}

interface TripPaymentEligibility {
  id: string;
  status: string;
  final_fare: number;
  passenger: { id: string; user_id: string };
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Sesión inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    const { tripId, amount, driverAmount, platformAmount, driverSellerId, description } = body;

    if (!tripId || !amount || !driverAmount || !platformAmount || !driverSellerId) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select(`
        id,
        status,
        final_fare,
        passenger:passengers!inner(id, user_id),
        driver:drivers!inner(id, mp_seller_id)
      `)
      .eq('id', tripId)
      .maybeSingle();

    if (tripError || !tripData) {
      throw new Error('Viaje no encontrado');
    }

    const typedTrip = tripData as unknown as TripPaymentEligibility;
    if (typedTrip.passenger.user_id !== user.id) {
      throw new Error('No autorizado para pagar este viaje');
    }

    if (typedTrip.status !== 'COMPLETED') {
      throw new Error('El viaje debe estar finalizado antes de pagar');
    }

    if (Number(typedTrip.final_fare) !== Number(amount)) {
      throw new Error('Monto inválido para el viaje');
    }

    const { data: driverToken, error: tokenError } = await supabase
      .from('driver_oauth_tokens')
      .select('access_token, expires_at')
      .eq('driver_id', driverSellerId)
      .eq('is_active', true)
      .maybeSingle();

    if (tokenError || !driverToken) {
      throw new Error('El conductor no tiene una cuenta de Mercado Pago vinculada. Debe conectar su cuenta primero.');
    }

    const expiresAt = new Date(driverToken.expires_at);
    if (expiresAt < new Date()) {
      throw new Error('El token de Mercado Pago del conductor ha expirado. Debe volver a conectar su cuenta.');
    }

    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('key, value')
      .eq('category', 'payment')
      .eq('key', 'mp_platform_seller_id')
      .maybeSingle();

    if (settingsError || !settings) {
      throw new Error('Error al obtener configuración de la plataforma');
    }

    const platformSellerId = settings.value;

    if (!platformSellerId) {
      throw new Error('MP_PLATFORM_SELLER_ID no configurado. Configure Mercado Pago en el panel de administración.');
    }

    const driverAccessToken = driverToken.access_token;

    const preference = {
      items: [
        {
          title: description || `Viaje VIVO - ${tripId.substring(0, 8)}`,
          quantity: 1,
          unit_price: amount,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: 'passenger@vivo.com',
      },
      back_urls: {
        success: `${Deno.env.get('VITE_APP_URL') || 'http://localhost:5173'}/payment-success`,
        failure: `${Deno.env.get('VITE_APP_URL') || 'http://localhost:5173'}/payment-failure`,
        pending: `${Deno.env.get('VITE_APP_URL') || 'http://localhost:5173'}/payment-pending`,
      },
      auto_return: 'approved' as const,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      external_reference: tripId,
      marketplace_fee: platformAmount,
      statement_descriptor: 'VIVO',
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${driverAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('Error de Mercado Pago:', errorData);
      throw new Error(`Error de Mercado Pago: ${errorData.message || 'Error desconocido'}`);
    }

    const mpData = await mpResponse.json();

    const { error: insertError } = await supabase.from('trip_payments').insert({
      trip_id: tripId,
      total_amount: amount,
      driver_amount: driverAmount,
      platform_amount: platformAmount,
      mp_payment_id: mpData.id,
      mp_status: 'pending',
      driver_mp_seller_id: driverSellerId,
      platform_mp_seller_id: platformSellerId,
      installments: 1,
    });

    if (insertError) {
      console.error('Error al guardar pago:', insertError);
      throw new Error('Error al guardar información de pago');
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
      }
    );
  } catch (error) {
    console.error('Error en create-payment-preference:', error);
    return new Response(
      JSON.stringify({
        error: true,
        message: error.message || 'Error al crear preferencia de pago',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
