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
    const platformSellerId = Deno.env.get('MP_PLATFORM_SELLER_ID');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuración de Supabase no disponible');
    }

    if (!mpAccessToken) {
      throw new Error('MP_ACCESS_TOKEN no configurado. Configure esta variable de entorno con su Access Token de Mercado Pago.');
    }

    if (!platformSellerId) {
      throw new Error('MP_PLATFORM_SELLER_ID no configurado. Configure esta variable de entorno con el Seller ID de la plataforma.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        'Authorization': `Bearer ${mpAccessToken}`,
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
