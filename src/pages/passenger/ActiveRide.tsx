import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, User, Car, Phone, Clock, Navigation, CheckCircle, Star } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type TripRow = Database['public']['Tables']['trips']['Row'];
type DriverRow = Database['public']['Tables']['drivers']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

interface TripWithDetails extends TripRow {
  driver?: DriverRow & { user_profile?: UserProfileRow };
}

interface ActiveRideProps {
  onBack: () => void;
  tripId?: string;
}

export function ActiveRide({ onBack, tripId }: ActiveRideProps) {
  const { user } = useAuth();
  const [trip, setTrip] = useState<TripWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (tripId) {
      fetchTripDetails(tripId);
      const interval = setInterval(() => fetchTripDetails(tripId), 5000);
      return () => clearInterval(interval);
    } else {
      fetchActiveTrip();
      const interval = setInterval(() => fetchActiveTrip(), 5000);
      return () => clearInterval(interval);
    }
  }, [tripId, user]);

  const fetchActiveTrip = async () => {
    if (!user) return;

    try {
      const { data: passenger } = await supabase
        .from('passengers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!passenger) return;

      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          driver:drivers(
            *,
            user_profile:user_profiles(*)
          )
        `)
        .eq('passenger_id', passenger.id)
        .in('status', ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'])
        .order('requested_at', { ascending: false })
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

  const fetchTripDetails = async (id: string) => {
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
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setTrip(data as TripWithDetails);
    } catch (error) {
      console.error('Error fetching trip details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!trip || cancelling) return;

    if (!confirm('¿Estás seguro que querés cancelar este viaje?')) return;

    setCancelling(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ status: 'CANCELLED_BY_PASSENGER' })
        .eq('id', trip.id);

      if (error) throw error;
      onBack();
    } catch (error) {
      console.error('Error cancelling trip:', error);
      alert('Error al cancelar el viaje');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusInfo = (status: TripRow['status']) => {
    switch (status) {
      case 'REQUESTED':
        return {
          title: 'Buscando conductor',
          description: 'Estamos buscando un conductor disponible para tu viaje',
          color: 'blue',
          icon: Navigation,
        };
      case 'ACCEPTED':
        return {
          title: 'Conductor asignado',
          description: 'Un conductor aceptó tu viaje y está en camino',
          color: 'green',
          icon: CheckCircle,
        };
      case 'DRIVER_ARRIVING':
        return {
          title: 'Conductor en camino',
          description: 'El conductor está llegando a tu ubicación',
          color: 'blue',
          icon: Car,
        };
      case 'DRIVER_ARRIVED':
        return {
          title: 'Conductor llegó',
          description: 'Tu conductor está esperándote',
          color: 'green',
          icon: MapPin,
        };
      case 'IN_PROGRESS':
        return {
          title: 'Viaje en curso',
          description: 'Estás en camino a tu destino',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
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
          <Card className="text-center py-12">
            <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No hay viajes activos</h2>
            <p className="text-gray-600">Solicitá un viaje para comenzar</p>
          </Card>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(trip.status);
  const StatusIcon = statusInfo.icon;
  const driver = trip.driver;
  const driverProfile = driver?.user_profile;

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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card className={`bg-${statusInfo.color}-50 border-2 border-${statusInfo.color}-200`}>
          <div className="flex items-center gap-4">
            <StatusIcon className={`w-12 h-12 text-${statusInfo.color}-600`} />
            <div className="flex-1">
              <h2 className={`text-xl font-bold text-${statusInfo.color}-900`}>{statusInfo.title}</h2>
              <p className={`text-${statusInfo.color}-700`}>{statusInfo.description}</p>
            </div>
          </div>
        </Card>

        {driver && driverProfile && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Tu conductor</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                {driverProfile.profile_photo_url ? (
                  <img
                    src={driverProfile.profile_photo_url}
                    alt={driverProfile.full_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-lg">{driverProfile.full_name}</p>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-gray-700">{driver.average_rating.toFixed(1)}</span>
                  <span className="text-gray-500 text-sm">({driver.total_ratings} viajes)</span>
                </div>
              </div>
              {driverProfile.phone && (
                <a href={`tel:${driverProfile.phone}`}>
                  <Button variant="outline" size="sm">
                    <Phone className="w-4 h-4 mr-2" />
                    Llamar
                  </Button>
                </a>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Vehículo</p>
                <p className="font-medium text-gray-900">
                  {driver.vehicle_brand} {driver.vehicle_model}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Color</p>
                <p className="font-medium text-gray-900">{driver.vehicle_color}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Patente</p>
                <p className="font-medium text-gray-900 uppercase">{driver.vehicle_plate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Año</p>
                <p className="font-medium text-gray-900">{driver.vehicle_year}</p>
              </div>
            </div>
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

            {trip.estimated_distance_km && (
              <div className="flex items-start gap-3">
                <Navigation className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Distancia estimada</p>
                  <p className="font-medium text-gray-900">{trip.estimated_distance_km} km</p>
                </div>
              </div>
            )}

            {trip.estimated_fare && (
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-1">$</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Tarifa estimada</p>
                  <p className="text-2xl font-bold text-gray-900">${trip.estimated_fare}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-4">Línea de tiempo</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Viaje solicitado</p>
                <p className="text-xs text-gray-600">
                  {new Date(trip.requested_at).toLocaleString('es-AR')}
                </p>
              </div>
            </div>

            {trip.accepted_at && (
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Conductor asignado</p>
                  <p className="text-xs text-gray-600">
                    {new Date(trip.accepted_at).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            )}

            {trip.driver_arrived_at && (
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Conductor llegó</p>
                  <p className="text-xs text-gray-600">
                    {new Date(trip.driver_arrived_at).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            )}

            {trip.started_at && (
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Viaje iniciado</p>
                  <p className="text-xs text-gray-600">
                    {new Date(trip.started_at).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {trip.status === 'REQUESTED' && (
          <Button
            variant="outline"
            onClick={handleCancelTrip}
            disabled={cancelling}
            fullWidth
          >
            {cancelling ? 'Cancelando...' : 'Cancelar viaje'}
          </Button>
        )}
      </div>
    </div>
  );
}
