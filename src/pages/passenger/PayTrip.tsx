import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CreditCard, CheckCircle, Clock, Loader } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { FeedbackBanner } from '../../components/FeedbackBanner';
import { supabase } from '../../lib/supabase';
import { createPaymentPreference, getPaymentStatus } from '../../lib/mercadoPago';
import type { Database } from '../../lib/database.types';
import { AppError } from '../../lib/errors';
import { logClientError, logOperationalEvent, getTraceId } from '../../lib/observability';

type TripRow = Database['public']['Tables']['trips']['Row'];
type DriverRow = Database['public']['Tables']['drivers']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

interface TripWithDriver extends TripRow {
  driver: DriverRow & { user_profile: UserProfileRow };
}

interface PayTripProps {
  tripId: string;
  onBack: () => void;
  onPaymentComplete: () => void;
}

export function PayTrip({ tripId, onBack, onPaymentComplete }: PayTripProps) {
  const [trip, setTrip] = useState<TripWithDriver | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const handledApprovedRef = useRef(false);
  const traceIdRef = useRef(getTraceId());

  useEffect(() => {
    fetchTripDetails();
    checkExistingPayment();
    const interval = setInterval(checkExistingPayment, 5000);
    return () => clearInterval(interval);
  }, [tripId]);

  const fetchTripDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          driver:drivers(
            *,
            user_profile:user_profiles(*)
          )
        `)
        .eq('id', tripId)
        .maybeSingle();

      if (error) throw error;
      setTrip(data as TripWithDriver);
    } catch (err) {
      logClientError('PAY_TRIP_FETCH_TRIP', err, { tripId, traceId: traceIdRef.current });
      setError('Error al cargar detalles del viaje');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingPayment = async () => {
    setCheckingStatus(true);
    try {
      const status = await getPaymentStatus(tripId);
      if (status) {
        setPaymentStatus(status.status);
        if (status.status === 'approved' && !handledApprovedRef.current) {
          handledApprovedRef.current = true;
          setTimeout(() => {
            onPaymentComplete();
          }, 2000);
        }
      }
    } catch (err) {
      logClientError('PAY_TRIP_CHECK_PAYMENT', err, { tripId, traceId: traceIdRef.current });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handlePayment = async () => {
    if (!trip || !trip.driver) {
      setError('Información del viaje incompleta');
      return;
    }
    if (paymentStatus === 'approved') {
      setError('Este viaje ya fue pagado');
      return;
    }

    if (!trip.final_fare) {
      setError('El viaje no tiene una tarifa calculada');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      await logOperationalEvent({
        domain: 'PAYMENTS',
        action: 'PAYMENT_PREFERENCE_REQUESTED',
        status: 'SUCCESS',
        entityId: trip.id,
        metadata: { traceId: traceIdRef.current },
      });

      const preference = await createPaymentPreference({
        tripId: trip.id,
      });

      window.location.href = preference.init_point;
    } catch (err) {
      const appError = logClientError('PAY_TRIP_CREATE_PAYMENT', err, { tripId: trip.id, traceId: traceIdRef.current });
      await logOperationalEvent({
        domain: 'PAYMENTS',
        action: 'PAYMENT_PREFERENCE_REQUESTED',
        status: 'FAILED',
        entityId: trip.id,
        metadata: { traceId: traceIdRef.current, reason: appError.code },
      });

      if (err instanceof AppError && err.kind === 'BUSINESS') {
        setError(err.userMessage);
      } else {
        setError('No pudimos iniciar el pago. Reintentá en unos segundos.');
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver
            </button>
          </div>
        </nav>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Viaje no encontrado
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pagar Viaje</h1>
          <p className="text-gray-600">Completá el pago de tu viaje</p>
        </div>

        {error && (
          <div className="mb-6">
            <FeedbackBanner
              tone="error"
              title="No se pudo completar la operación"
              message={`${error} (trace: ${traceIdRef.current.slice(0, 8)})`}
            />
          </div>
        )}

        {paymentStatus === 'approved' && (
          <Card className="mb-6 bg-green-50 border-2 border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Pago Confirmado</h3>
                <p className="text-green-800 text-sm">
                  Tu pago ha sido procesado exitosamente. Serás redirigido en breve.
                </p>
              </div>
            </div>
          </Card>
        )}

        {paymentStatus === 'pending' && (
          <Card className="mb-6 bg-yellow-50 border-2 border-yellow-200">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Pago Pendiente</h3>
                <p className="text-yellow-800 text-sm">
                  Tu pago está siendo procesado. Te notificaremos cuando se confirme.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Detalles del Viaje</h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Origen</p>
              <p className="font-medium">{trip.origin_address}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Destino</p>
              <p className="font-medium">{trip.destination_address}</p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">Conductor</p>
              <p className="font-medium">{trip.driver.user_profile.full_name}</p>
            </div>

            {trip.actual_distance_km && (
              <div>
                <p className="text-sm text-gray-600">Distancia recorrida</p>
                <p className="font-medium">{trip.actual_distance_km.toFixed(2)} km</p>
              </div>
            )}

            {trip.actual_duration_minutes && (
              <div>
                <p className="text-sm text-gray-600">Duración</p>
                <p className="font-medium">{trip.actual_duration_minutes} minutos</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-4">Resumen de Pago</h2>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Tarifa del viaje</span>
              <span className="font-medium">${trip.final_fare?.toFixed(2) || '0.00'}</span>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total a pagar</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${trip.final_fare?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </div>

          {!paymentStatus && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Pago seguro con Mercado Pago</p>
                    <p className="text-sm text-blue-800">
                      Serás redirigido a Mercado Pago para completar tu pago de forma segura.
                      Aceptamos todas las tarjetas de crédito y débito.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handlePayment}
                disabled={processing || !trip.final_fare}
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Creando pago...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pagar con Mercado Pago
                  </>
                )}
              </Button>
            </>
          )}

          {paymentStatus === 'pending' && (
            <Button
              onClick={checkExistingPayment}
              disabled={checkingStatus}
              variant="secondary"
              className="w-full"
            >
              {checkingStatus ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Estado del Pago'
              )}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
