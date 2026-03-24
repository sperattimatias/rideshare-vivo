import { useState, useEffect } from 'react';
import { MapPin, Clock, DollarSign, User, Navigation, Phone, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type TripRow = Database['public']['Tables']['trips']['Row'];
type PassengerRow = Database['public']['Tables']['passengers']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

interface TripWithDetails extends TripRow {
  passenger?: PassengerRow & { user_profile?: UserProfileRow };
}

interface TripRequestsProps {
  driverId: string;
  isOnline: boolean;
  onAccept: () => void;
}

export function TripRequests({ driverId, isOnline, onAccept }: TripRequestsProps) {
  const [requests, setRequests] = useState<TripWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  useEffect(() => {
    if (isOnline) {
      fetchTripRequests();
      const interval = setInterval(fetchTripRequests, 5000);
      return () => clearInterval(interval);
    } else {
      setRequests([]);
      setLoading(false);
    }
  }, [driverId, isOnline]);

  const fetchTripRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          passenger:passengers(
            *,
            user_profile:user_profiles(*)
          )
        `)
        .eq('status', 'REQUESTED')
        .is('driver_id', null)
        .order('requested_at', { ascending: true })
        .limit(5);

      if (error) throw error;
      setRequests(data as TripWithDetails[]);
    } catch (error) {
      console.error('Error fetching trip requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTrip = async (tripId: string) => {
    setAccepting(tripId);

    try {
      const { error: updateError } = await supabase
        .from('trips')
        .update({
          driver_id: driverId,
          status: 'ACCEPTED',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', tripId)
        .is('driver_id', null);

      if (updateError) throw updateError;

      await supabase
        .from('drivers')
        .update({
          is_on_trip: true,
        })
        .eq('id', driverId);

      onAccept();
      fetchTripRequests();
    } catch (error) {
      console.error('Error accepting trip:', error);
      alert('Error al aceptar el viaje. Puede que otro conductor ya lo haya aceptado.');
    } finally {
      setAccepting(null);
    }
  };

  const handleRejectTrip = async (tripId: string) => {
    setRejecting(tripId);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setRequests(requests.filter((r) => r.id !== tripId));
    } finally {
      setRejecting(null);
    }
  };

  const calculateDistance = (trip: TripRow) => {
    return (Math.random() * 10 + 1).toFixed(1);
  };

  if (!isOnline) {
    return (
      <Card className="bg-gray-50">
        <div className="text-center py-12">
          <Navigation className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Estás fuera de línea</h3>
          <p className="text-gray-600">
            Activá tu disponibilidad para comenzar a recibir solicitudes de viaje
          </p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Buscando viajes...</p>
        </div>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="bg-blue-50 border-2 border-blue-200">
        <div className="text-center py-12">
          <Navigation className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h3 className="text-xl font-semibold text-blue-900 mb-2">Buscando viajes cercanos...</h3>
          <p className="text-blue-800">
            No hay solicitudes disponibles en este momento. Seguí en línea para recibir notificaciones.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <p className="font-semibold text-green-900">
            {requests.length} {requests.length === 1 ? 'viaje disponible' : 'viajes disponibles'}
          </p>
        </div>
      </div>

      {requests.map((trip) => {
        const passenger = trip.passenger;
        const passengerProfile = passenger?.user_profile;
        const distance = calculateDistance(trip);

        return (
          <Card key={trip.id} className="border-2 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-600">
                      Solicitado hace{' '}
                      {Math.floor((Date.now() - new Date(trip.requested_at).getTime()) / 60000)} min
                    </span>
                  </div>
                  {passengerProfile && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        {passengerProfile.profile_photo_url ? (
                          <img
                            src={passengerProfile.profile_photo_url}
                            alt={passengerProfile.full_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{passengerProfile.full_name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Navigation className="w-4 h-4" />
                          <span>{distance} km de distancia</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">Origen</p>
                    <p className="text-sm font-medium text-gray-900">{trip.origin_address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">Destino</p>
                    <p className="text-sm font-medium text-gray-900">{trip.destination_address}</p>
                  </div>
                </div>

                {trip.estimated_distance_km && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">
                      Distancia estimada: {trip.estimated_distance_km} km
                    </span>
                  </div>
                )}
              </div>

              {trip.estimated_fare && (
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-xs text-green-700">Ganancia estimada (80%)</p>
                      <p className="text-2xl font-bold text-green-900">
                        ${Math.round(trip.estimated_fare * 0.8)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Tarifa total</p>
                    <p className="text-lg font-semibold text-gray-900">${trip.estimated_fare}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleRejectTrip(trip.id)}
                  disabled={!!accepting || !!rejecting}
                  fullWidth
                >
                  {rejecting === trip.id ? (
                    'Rechazando...'
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazar
                    </>
                  )}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleAcceptTrip(trip.id)}
                  disabled={!!accepting || !!rejecting}
                  fullWidth
                >
                  {accepting === trip.id ? (
                    'Aceptando...'
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aceptar
                    </>
                  )}
                </Button>
              </div>

              {trip.scheduled_for && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                      Viaje programado para:{' '}
                      {new Date(trip.scheduled_for).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
