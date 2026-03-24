import { supabase } from './supabase';

export interface MercadoPagoPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export interface CreatePaymentPreferenceParams {
  tripId: string;
  amount: number;
  driverAmount: number;
  platformAmount: number;
  driverSellerId: string;
  description: string;
}

export interface PaymentStatus {
  tripId: string;
  paymentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled';
  statusDetail?: string;
}

export async function createPaymentPreference(
  params: CreatePaymentPreferenceParams
): Promise<MercadoPagoPreference> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const { data: { session } } = await supabase.auth.getSession();

  if (!supabaseUrl || !session?.access_token) {
    throw new Error('Configuración de Supabase no encontrada');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-preference`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear preferencia de pago');
  }

  const data = await response.json();
  return data;
}

export async function getPaymentStatus(tripId: string): Promise<PaymentStatus | null> {
  try {
    const { data, error } = await supabase
      .from('trip_payments')
      .select('*')
      .eq('trip_id', tripId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      tripId: data.trip_id,
      paymentId: data.mp_payment_id,
      status: data.mp_status,
      statusDetail: data.mp_status_detail || undefined,
    };
  } catch (error) {
    console.error('Error getting payment status:', error);
    return null;
  }
}

export async function checkPaymentCompletion(tripId: string): Promise<boolean> {
  const status = await getPaymentStatus(tripId);
  return status?.status === 'approved';
}

export function getPaymentStatusDisplay(status: string): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case 'pending':
      return {
        label: 'Pendiente',
        color: 'yellow',
        icon: 'clock',
      };
    case 'approved':
      return {
        label: 'Pagado',
        color: 'green',
        icon: 'check-circle',
      };
    case 'rejected':
      return {
        label: 'Rechazado',
        color: 'red',
        icon: 'x-circle',
      };
    case 'refunded':
      return {
        label: 'Reembolsado',
        color: 'blue',
        icon: 'arrow-left-circle',
      };
    case 'cancelled':
      return {
        label: 'Cancelado',
        color: 'gray',
        icon: 'x-circle',
      };
    default:
      return {
        label: 'Desconocido',
        color: 'gray',
        icon: 'help-circle',
      };
  }
}
