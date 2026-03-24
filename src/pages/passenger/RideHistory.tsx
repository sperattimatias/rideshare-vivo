import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Calendar, DollarSign, Star, Clock, CheckCircle, XCircle } from 'lucide-react';
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

interface RideHistoryProps {
  onBack: () => void;
  onRateTrip: (tripId: string) => void;
  onViewTrip: (tripId: string) => void;
}

function RatingDisplay({ tripId, onRate }: { tripId: string; onRate: (tripId: string) => void }) {
  const [hasRating, setHasRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRating();
  }, [tripId]);

  const checkRating = async () => {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('rating')
        .eq('trip_id', tripId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHasRating(true);
        setRating(data.rating);
      }
    } catch (error) {
      console.error('Error checking rating:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-gray-500">Cargando...</div>;
  }

  if (!hasRating) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onRate(tripId);
        }}
      >
        <Star className="w-4 h-4 mr-1" />
        Calificar
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1 text-sm text-gray-600">
      <span>Tu calificación:</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function RideHistory({ onBack, onRateTrip, onViewTrip }: RideHistoryProps) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    fetchTripHistory();
  }, [user, filter]);

  const fetchTripHistory = async () => {
    if (!user) return;

    try {
      const { data: passenger } = await supabase
        .from('passengers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!passenger) return;

      let query = supabase
        .from('trips')
        .select(`
          *,
          driver:drivers(
            *,
            user_profile:user_profiles(*)
          )
        `)
        .eq('passenger_id', passenger.id)
        .order('requested_at', { ascending: false });

      if (filter === 'completed') {
        query = query.eq('status', 'COMPLETED');
      } else if (filter === 'cancelled') {
        query = query.in('status', ['CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_SYSTEM']);
      } else {
        query = query.in('status', ['COMPLETED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_SYSTEM']);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTrips(data as TripWithDetails[]);
    } catch (error) {
      console.error('Error fetching trip history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: TripRow['status']) => {
    if (status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          Completado
        </span>
      );
    } else if (status.startsWith('CANCELLED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" />
          Cancelado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <Clock className="w-3 h-3" />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando historial...</p>
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Historial de Viajes</h1>
          <p className="text-gray-600">Revisá tus viajes anteriores</p>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todos
          </Button>
          <Button
            variant={filter === 'completed' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Completados
          </Button>
          <Button
            variant={filter === 'cancelled' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('cancelled')}
          >
            Cancelados
          </Button>
        </div>

        {trips.length === 0 ? (
          <Card className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No hay viajes en el historial</h2>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'Tus viajes completados y cancelados aparecerán aquí'
                : filter === 'completed'
                ? 'No tenés viajes completados todavía'
                : 'No tenés viajes cancelados'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => {
              const driver = trip.driver;
              const driverProfile = driver?.user_profile;

              return (
                <Card key={trip.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div onClick={() => onViewTrip(trip.id)}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-600" />
                        <p className="text-sm text-gray-600">
                          {new Date(trip.requested_at).toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      {getStatusBadge(trip.status)}
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600">Origen</p>
                          <p className="text-sm text-gray-900 truncate">{trip.origin_address}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600">Destino</p>
                          <p className="text-sm text-gray-900 truncate">{trip.destination_address}</p>
                        </div>
                      </div>
                    </div>

                    {driver && driverProfile && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-medium">
                          {driverProfile.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{driverProfile.full_name}</p>
                          <p className="text-xs text-gray-600">
                            {driver.vehicle_brand} {driver.vehicle_model} - {driver.vehicle_plate?.toUpperCase()}
                          </p>
                        </div>
                        {driver.average_rating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium text-gray-900">
                              {driver.average_rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <span className="text-lg font-bold text-gray-900">
                          ${trip.final_fare || trip.estimated_fare || 0}
                        </span>
                      </div>

                      {trip.status === 'COMPLETED' && (
                        <RatingDisplay tripId={trip.id} onRate={onRateTrip} />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
