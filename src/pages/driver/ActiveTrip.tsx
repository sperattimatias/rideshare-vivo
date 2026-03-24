import { useState, useEffect, useRef } from 'react';
import { MapPin, User, Phone, Navigation, CheckCircle, Clock, DollarSign, Map } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { STRINGS } from '../../lib/strings';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { calculateFare } from '../../lib/pricing';
import { canTransitionTo, getNextDriverStatus, canDriverCancel, getDriverActionLabel } from '../../lib/tripStates';
import { calculateDriverEarnings } from '../../lib/pricing';
import { calculateTripCompletion, completeTripTransaction, validateTripCompletion } from '../../lib/tripCompletion';
import { StaticMapLeaflet } from '../../components/StaticMapLeaflet';
import { StaticMap } from '../../components/StaticMap';

type TripRow = Database['public']['Tables']['trips']['Row'];
type PassengerRow = Database['public']['Tables']['passengers']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

interface TripWithDetails extends TripRow {
  passenger?: PassengerRow & { user_profile?: UserProfileRow };
}

interface ActiveTripProps {
  driverId: string;
  onComplete: () => void;
}

export function ActiveTrip({ driverId, onComplete }: ActiveTripProps) {
  const [trip, setTrip] = useState<TripWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [useRealMap, setUseRealMap] = useState(false);
  const locationWatchIdRef = useRef<number | null>(null);
  const lastLocationUpdateRef = useRef(0);

  useEffect(() => {
    fetchActiveTrip();
    const interval = setInterval(fetchActiveTrip, 5000);
    return () => clearInterval(interval);
  }, [driverId]);

  useEffect(() => {
    if (!trip || !['ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(trip.status)) {
      if (locationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator) || locationWatchIdRef.current !== null) {
      return;
    }

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        if (now - lastLocationUpdateRef.current < 5000) return;
        lastLocationUpdateRef.current = now;

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const wktPoint = `POINT(${lon} ${lat})`;

        await supabase
          .from('drivers')
          .update({
            current_location: wktPoint,
            last_location_update: new Date().toISOString(),
          })
          .eq('id', driverId);

        await supabase
          .from('trip_locations')
          .insert({
            trip_id: trip.id,
            driver_id: driverId,
            location: wktPoint,
            speed_kmh: position.coords.speed ? Number(position.coords.speed * 3.6) : null,
            heading: position.coords.heading ? Number(position.coords.heading) : null,
            accuracy_meters: Number(position.coords.accuracy),
          });
      },
      (error) => {
        console.error('Error tracking driver location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      }
    );

    return () => {
      if (locationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, [trip?.id, trip?.status, driverId]);

  const fetchActiveTrip = async () => {
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
        .eq('driver_id', driverId)
        .in('status', ['ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'])
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setTrip(data as TripWithDetails);
    } catch (error) {
      console.error('Error fetching active trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTripStatus = async (newStatus: TripRow['status'], additionalData?: any) => {
    if (!trip || updating) return;

    if (!canTransitionTo(trip.status, newStatus)) {
      alert(`No se puede cambiar de ${trip.status} a ${newStatus}`);
      return;
    }

    setUpdating(true);
    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...additionalData,
      };

      if (newStatus === 'DRIVER_ARRIVED') {
        updates.driver_arrived_at = new Date().toISOString();
      } else if (newStatus === 'IN_PROGRESS') {
        updates.started_at = new Date().toISOString();
      } else if (newStatus === 'COMPLETED') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', trip.id);

      if (error) throw error;

      fetchActiveTrip();
    } catch (error) {
      console.error('Error updating trip status:', error);
      alert('Error al actualizar el estado del viaje');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!trip || updating) return;

    if (!canDriverCancel(trip.status)) {
      alert('No podés cancelar el viaje en este momento');
      return;
    }

    if (!confirm('¿Estás seguro que querés cancelar este viaje?')) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          status: 'CANCELLED_BY_DRIVER',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', trip.id);

      if (error) throw error;

      await supabase
        .from('drivers')
        .update({
          is_on_trip: false,
        })
        .eq('id', driverId);

      onComplete();
    } catch (error) {
      console.error('Error cancelling trip:', error);
      alert('Error al cancelar el viaje');
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!trip || updating) return;

    const validation = validateTripCompletion(trip);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const actualDistance = prompt('Ingresá la distancia real recorrida (km):',
      trip.estimated_distance_km?.toString() || '');

    if (!actualDistance) return;

    const distance = parseFloat(actualDistance);
    if (isNaN(distance) || distance <= 0) {
      alert('Distancia inválida');
      return;
    }

    setUpdating(true);
    try {
      const completionData = await calculateTripCompletion(trip, distance);

      const confirm = window.confirm(
        `Finalizar viaje:\n\n` +
        `Distancia: ${completionData.actualDistanceKm} km\n` +
        `Duración: ${completionData.actualDurationMinutes} min\n` +
        `Tarifa total: $${completionData.finalFare}\n` +
        `Tu ganancia: $${completionData.driverEarnings}\n\n` +
        `¿Confirmar?`
      );

      if (!confirm) {
        setUpdating(false);
        return;
      }

      const result = await completeTripTransaction(
        trip.id,
        driverId,
        trip.passenger_id,
        completionData
      );

      if (!result.success) {
        throw new Error(result.error || 'Error al finalizar el viaje');
      }

      alert(`¡Viaje finalizado!\n\nGanaste $${completionData.driverEarnings}`);
      onComplete();
    } catch (error) {
      console.error('Error completing trip:', error);
      alert('Error al finalizar el viaje. Por favor intentá nuevamente.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{STRINGS.common.loading}</p>
        </div>
      </Card>
    );
  }

  if (!trip) {
    return null;
  }

  const passenger = trip.passenger;
  const passengerProfile = passenger?.user_profile;

  const getActionButton = () => {
    switch (trip.status) {
      case 'ACCEPTED':
        return (
          <Button
            variant="primary"
            onClick={() => updateTripStatus('DRIVER_ARRIVING')}
            disabled={updating}
            fullWidth
          >
            <Navigation className="w-4 h-4 mr-2" />
            {updating ? 'Actualizando...' : 'Ir a buscar pasajero'}
          </Button>
        );
      case 'DRIVER_ARRIVING':
        return (
          <Button
            variant="primary"
            onClick={() => updateTripStatus('DRIVER_ARRIVED')}
            disabled={updating}
            fullWidth
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {updating ? 'Actualizando...' : 'Ya llegué'}
          </Button>
        );
      case 'DRIVER_ARRIVED':
        return (
          <Button
            variant="primary"
            onClick={() => updateTripStatus('IN_PROGRESS')}
            disabled={updating}
            fullWidth
          >
            <Navigation className="w-4 h-4 mr-2" />
            {updating ? 'Actualizando...' : 'Iniciar viaje'}
          </Button>
        );
      case 'IN_PROGRESS':
        return (
          <Button
            variant="primary"
            onClick={handleCompleteTrip}
            disabled={updating}
            fullWidth
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {updating ? 'Procesando...' : 'Finalizar viaje'}
          </Button>
        );
      default:
        return null;
    }
  };

  const getStatusInfo = () => {
    switch (trip.status) {
      case 'ACCEPTED':
        return {
          title: 'Viaje aceptado',
          description: 'Confirmá cuando vayas a buscar al pasajero',
          color: 'blue',
          icon: CheckCircle,
        };
      case 'DRIVER_ARRIVING':
        return {
          title: 'Yendo a buscar',
          description: 'Dirigite al punto de origen',
          color: 'blue',
          icon: Navigation,
        };
      case 'DRIVER_ARRIVED':
        return {
          title: 'Llegaste al origen',
          description: 'Esperá al pasajero y confirmá cuando suba',
          color: 'green',
          icon: MapPin,
        };
      case 'IN_PROGRESS':
        return {
          title: 'Viaje en curso',
          description: 'Llevá al pasajero a su destino',
          color: 'purple',
          icon: Navigation,
        };
      default:
        return {
          title: 'Estado desconocido',
          description: '',
          color: 'gray',
          icon: Clock,
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-4">
      <Card className={`bg-${statusInfo.color}-50 border-2 border-${statusInfo.color}-200`}>
        <div className="flex items-center gap-4">
          <StatusIcon className={`w-12 h-12 text-${statusInfo.color}-600`} />
          <div className="flex-1">
            <h2 className={`text-xl font-bold text-${statusInfo.color}-900`}>{statusInfo.title}</h2>
            <p className={`text-${statusInfo.color}-700`}>{statusInfo.description}</p>
          </div>
        </div>
      </Card>

      {passenger && passengerProfile && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Tu pasajero</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              {passengerProfile.profile_photo_url ? (
                <img
                  src={passengerProfile.profile_photo_url}
                  alt={passengerProfile.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-gray-500" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-lg">{passengerProfile.full_name}</p>
              <p className="text-gray-600 text-sm">{passenger.total_trips} viajes realizados</p>
            </div>
            {passengerProfile.phone && (
              <a href={`tel:${passengerProfile.phone}`}>
                <Button variant="outline" size="sm">
                  <Phone className="w-4 h-4 mr-2" />
                  Llamar
                </Button>
              </a>
            )}
          </div>
        </Card>
      )}

      {trip.origin_latitude && trip.origin_longitude && trip.destination_latitude && trip.destination_longitude && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Mapa del viaje</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseRealMap(!useRealMap)}
            >
              <Map className="w-4 h-4 mr-2" />
              {useRealMap ? 'Mapa Simple' : 'Mapa Real (OSM)'}
            </Button>
          </div>
          {useRealMap ? (
            <StaticMapLeaflet
              center={{
                lat: (Number(trip.origin_latitude) + Number(trip.destination_latitude)) / 2,
                lon: (Number(trip.origin_longitude) + Number(trip.destination_longitude)) / 2,
              }}
              zoom={13}
              markers={[
                {
                  coordinates: {
                    lat: Number(trip.origin_latitude),
                    lon: Number(trip.origin_longitude)
                  },
                  label: 'A',
                  color: 'green'
                },
                {
                  coordinates: {
                    lat: Number(trip.destination_latitude),
                    lon: Number(trip.destination_longitude)
                  },
                  label: 'B',
                  color: 'red'
                },
              ]}
              path={[
                { lat: Number(trip.origin_latitude), lon: Number(trip.origin_longitude) },
                { lat: Number(trip.destination_latitude), lon: Number(trip.destination_longitude) },
              ]}
              className="w-full"
              height="300px"
            />
          ) : (
            <StaticMap
              center={{
                lat: (Number(trip.origin_latitude) + Number(trip.destination_latitude)) / 2,
                lon: (Number(trip.origin_longitude) + Number(trip.destination_longitude)) / 2,
              }}
              zoom={13}
              width={600}
              height={300}
              markers={[
                {
                  coordinates: {
                    lat: Number(trip.origin_latitude),
                    lon: Number(trip.origin_longitude)
                  },
                  label: 'A',
                  color: 'green'
                },
                {
                  coordinates: {
                    lat: Number(trip.destination_latitude),
                    lon: Number(trip.destination_longitude)
                  },
                  label: 'B',
                  color: 'red'
                },
              ]}
              path={[
                { lat: Number(trip.origin_latitude), lon: Number(trip.origin_longitude) },
                { lat: Number(trip.destination_latitude), lon: Number(trip.destination_longitude) },
              ]}
              className="w-full"
              alt="Mapa del viaje"
            />
          )}
        </Card>
      )}

      <Card>
        <h3 className="text-lg font-semibold mb-4">Detalles del viaje</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-gray-600">Origen</p>
              <p className="font-medium text-gray-900">{trip.origin_address}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-gray-600">Destino</p>
              <p className="font-medium text-gray-900">{trip.destination_address}</p>
            </div>
          </div>

          {trip.estimated_fare && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Tu ganancia estimada (80%)</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${calculateDriverEarnings(trip.estimated_fare)}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-green-600" />
              </div>
              <div className="mt-2 pt-2 border-t border-green-200 flex items-center justify-between text-sm">
                <span className="text-green-700">Tarifa total</span>
                <span className="font-semibold text-green-900">${trip.estimated_fare}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-4">Línea de tiempo</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${trip.accepted_at ? 'bg-green-600' : 'bg-gray-300'}`}>
              {trip.accepted_at && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Viaje aceptado</p>
              <p className="text-xs text-gray-600">
                {trip.accepted_at && new Date(trip.accepted_at).toLocaleString('es-AR')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${trip.status === 'DRIVER_ARRIVING' || trip.status === 'DRIVER_ARRIVED' || trip.started_at ? 'bg-green-600' : 'bg-gray-300'}`}>
              {(trip.status === 'DRIVER_ARRIVING' || trip.status === 'DRIVER_ARRIVED' || trip.started_at) && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Yendo a buscar</p>
              <p className="text-xs text-gray-600">
                {trip.status === 'DRIVER_ARRIVING' || trip.status === 'DRIVER_ARRIVED' || trip.started_at ? 'Confirmado' : 'Pendiente'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${trip.driver_arrived_at ? 'bg-green-600' : 'bg-gray-300'}`}>
              {trip.driver_arrived_at && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Llegaste al origen</p>
              <p className="text-xs text-gray-600">
                {trip.driver_arrived_at ? new Date(trip.driver_arrived_at).toLocaleString('es-AR') : 'Pendiente'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${trip.started_at ? 'bg-green-600' : 'bg-gray-300'}`}>
              {trip.started_at && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Viaje iniciado</p>
              <p className="text-xs text-gray-600">
                {trip.started_at ? new Date(trip.started_at).toLocaleString('es-AR') : 'Pendiente'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${trip.completed_at ? 'bg-green-600' : 'bg-gray-300'}`}>
              {trip.completed_at && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Viaje finalizado</p>
              <p className="text-xs text-gray-600">
                {trip.completed_at ? new Date(trip.completed_at).toLocaleString('es-AR') : 'Pendiente'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {getActionButton()}

        {canDriverCancel(trip.status) && (
          <Button
            variant="outline"
            onClick={handleCancelTrip}
            disabled={updating}
            fullWidth
          >
            Cancelar viaje
          </Button>
        )}
      </div>
    </div>
  );
}
