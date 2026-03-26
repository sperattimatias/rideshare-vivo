import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  User,
  Car,
  Clock,
  DollarSign,
  Navigation,
  CheckCircle,
  XCircle,
  AlertCircle,
  Ban,
  FileText,
  Star,
  Map,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { AdminLoadingState, AdminEmptyState } from '../../components/admin/AdminStates';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { getTripDetails, getTripGPSHistory, cancelTripByAdmin, createIncident } from '../../lib/adminOperations';
import { LeafletMap } from '../../components/LeafletMap';
import { LiveMap } from '../../components/LiveMap';

type TripRow = Database['public']['Tables']['trips']['Row'];
type DriverRow = Database['public']['Tables']['drivers']['Row'];
type PassengerRow = Database['public']['Tables']['passengers']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

interface TripWithDetails extends TripRow {
  driver?: DriverRow & { user_profile?: UserProfileRow };
  passenger?: PassengerRow & { user_profile?: UserProfileRow };
}

interface TripMonitoringProps {
  onBack: () => void;
}

export function TripMonitoring({ onBack }: TripMonitoringProps) {
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'completed' | 'cancelled' | 'all'>('active');
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [tripDetails, setTripDetails] = useState<unknown>(null);
  const [gpsHistory, setGpsHistory] = useState<unknown[]>([]);
  const [useRealMap, setUseRealMap] = useState(false);

  useEffect(() => {
    fetchTrips();
    const interval = setInterval(fetchTrips, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchTrips = async () => {
    try {
      let query = supabase
        .from('trips')
        .select(
          `
          *,
          driver:drivers(
            *,
            user_profile:user_profiles(*)
          ),
          passenger:passengers(
            *,
            user_profile:user_profiles(*)
          )
        `
        )
        .order('requested_at', { ascending: false });

      if (filter === 'active') {
        query = query.in('status', [
          'REQUESTED',
          'ACCEPTED',
          'DRIVER_ARRIVING',
          'DRIVER_ARRIVED',
          'IN_PROGRESS',
        ]);
      } else if (filter === 'completed') {
        query = query.eq('status', 'COMPLETED');
      } else if (filter === 'cancelled') {
        query = query.in('status', [
          'CANCELLED_BY_PASSENGER',
          'CANCELLED_BY_DRIVER',
          'CANCELLED_BY_SYSTEM',
        ]);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setTrips(data as TripWithDetails[]);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: TripRow['status']) => {
    switch (status) {
      case 'REQUESTED':
        return {
          label: 'Solicitado',
          color: 'yellow',
          icon: AlertCircle,
        };
      case 'ACCEPTED':
        return {
          label: 'Aceptado',
          color: 'blue',
          icon: CheckCircle,
        };
      case 'DRIVER_ARRIVING':
        return {
          label: 'Conductor llegando',
          color: 'blue',
          icon: Navigation,
        };
      case 'DRIVER_ARRIVED':
        return {
          label: 'Conductor llegó',
          color: 'green',
          icon: MapPin,
        };
      case 'IN_PROGRESS':
        return {
          label: 'En curso',
          color: 'blue',
          icon: Car,
        };
      case 'COMPLETED':
        return {
          label: 'Completado',
          color: 'green',
          icon: CheckCircle,
        };
      case 'CANCELLED_BY_PASSENGER':
      case 'CANCELLED_BY_DRIVER':
      case 'CANCELLED_BY_SYSTEM':
        return {
          label: 'Cancelado',
          color: 'red',
          icon: XCircle,
        };
      default:
        return {
          label: status,
          color: 'gray',
          icon: Clock,
        };
    }
  };

  const getStatusBadge = (status: TripRow['status']) => {
    const info = getStatusInfo(status);
    const Icon = info.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-${info.color}-100 text-${info.color}-800`}
      >
        <Icon className="w-3 h-3" />
        {info.label}
      </span>
    );
  };

  async function loadTripDetails(tripId: string) {
    try {
      const [details, gps] = await Promise.all([
        getTripDetails(tripId),
        getTripGPSHistory(tripId)
      ]);
      setTripDetails(details);
      setGpsHistory(gps);
    } catch (error) {
      console.error('Error loading trip details:', error);
    }
  }

  async function handleCancelTrip() {
    if (!selectedTrip) return;

    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;

    try {
      await cancelTripByAdmin(selectedTrip.id, reason);
      alert('Trip cancelled successfully');
      setSelectedTrip(null);
      await fetchTrips();
    } catch (error) {
      console.error('Error cancelling trip:', error);
      alert('Failed to cancel trip');
    }
  }

  async function handleCreateIncident() {
    if (!selectedTrip) return;

    const title = prompt('Incident title:');
    if (!title) return;

    const description = prompt('Incident description:');
    if (!description) return;

    try {
      await createIncident({
        incident_type: 'OTHER',
        severity: 'MEDIUM',
        title,
        description,
        trip_id: selectedTrip.id,
        driver_id: selectedTrip.driver_id || undefined,
        passenger_id: selectedTrip.passenger_id,
      });
      alert('Incident created successfully');
    } catch (error) {
      console.error('Error creating incident:', error);
      alert('Failed to create incident');
    }
  }

  useEffect(() => {
    if (selectedTrip) {
      loadTripDetails(selectedTrip.id);
    }
  }, [selectedTrip]);

  if (selectedTrip) {
    const driver = selectedTrip.driver;
    const driverProfile = driver?.user_profile;
    const passenger = selectedTrip.passenger;
    const passengerProfile = passenger?.user_profile;

    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => setSelectedTrip(null)}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver a la lista
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">Detalles del Viaje</h1>
              {getStatusBadge(selectedTrip.status)}
            </div>
            <p className="text-sm text-gray-600">ID: {selectedTrip.id}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {passengerProfile && (
              <Card>
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Pasajero</h2>
                </div>
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
                  <div>
                    <p className="font-semibold text-gray-900">{passengerProfile.full_name}</p>
                    <p className="text-sm text-gray-600">Email no disponible</p>
                    {passengerProfile.phone && (
                      <p className="text-sm text-gray-600">{passengerProfile.phone}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {driver && driverProfile && (
              <Card>
                <div className="flex items-center gap-3 mb-4">
                  <Car className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Conductor</h2>
                </div>
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
                  <div>
                    <p className="font-semibold text-gray-900">{driverProfile.full_name}</p>
                    <p className="text-sm text-gray-600">
                      {driver.vehicle_brand} {driver.vehicle_model} - {driver.vehicle_plate?.toUpperCase()}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <Card className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Detalles del Viaje</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Origen</p>
                  <p className="font-medium text-gray-900">{selectedTrip.origin_address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Destino</p>
                  <p className="font-medium text-gray-900">{selectedTrip.destination_address}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600">Distancia</p>
                  <p className="font-medium text-gray-900">
                    {selectedTrip.actual_distance_km || selectedTrip.estimated_distance_km || 0} km
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duración</p>
                  <p className="font-medium text-gray-900">
                    {selectedTrip.actual_duration_minutes || 'En curso'}{' '}
                    {selectedTrip.actual_duration_minutes && 'min'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tarifa</p>
                  <p className="font-medium text-gray-900">
                    ${selectedTrip.final_fare || selectedTrip.estimated_fare || 0}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Línea de Tiempo</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Viaje solicitado</p>
                  <p className="text-xs text-gray-600">
                    {new Date(selectedTrip.requested_at).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>

              {selectedTrip.accepted_at && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Conductor asignado</p>
                    <p className="text-xs text-gray-600">
                      {new Date(selectedTrip.accepted_at).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
              )}

              {selectedTrip.driver_arrived_at && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Conductor llegó</p>
                    <p className="text-xs text-gray-600">
                      {new Date(selectedTrip.driver_arrived_at).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
              )}

              {selectedTrip.started_at && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Viaje iniciado</p>
                    <p className="text-xs text-gray-600">
                      {new Date(selectedTrip.started_at).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
              )}

              {selectedTrip.completed_at && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Viaje completado</p>
                    <p className="text-xs text-gray-600">
                      {new Date(selectedTrip.completed_at).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Payment Details */}
          {tripDetails?.payment && (
            <Card className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Payment Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-medium text-gray-900">${tripDetails.payment.total_amount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Driver Amount</p>
                  <p className="font-medium text-gray-900">${tripDetails.payment.driver_amount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Platform Amount</p>
                  <p className="font-medium text-gray-900">${tripDetails.payment.platform_amount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <p className="font-medium text-gray-900">{tripDetails.payment.mp_status}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Rating */}
          {tripDetails?.rating && (
            <Card className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Rating
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Overall Rating</p>
                  <p className="font-medium text-gray-900">{tripDetails.rating.overall_rating}/5</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Safety</p>
                  <p className="font-medium text-gray-900">{tripDetails.rating.safety_rating || 'N/A'}/5</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cleanliness</p>
                  <p className="font-medium text-gray-900">{tripDetails.rating.cleanliness_rating || 'N/A'}/5</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Communication</p>
                  <p className="font-medium text-gray-900">{tripDetails.rating.communication_rating || 'N/A'}/5</p>
                </div>
              </div>
              {tripDetails.rating.comment && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-1">Comment</p>
                  <p className="text-gray-900">{tripDetails.rating.comment}</p>
                </div>
              )}
            </Card>
          )}

          {/* GPS History */}
          {gpsHistory.length > 0 && (
            <Card className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">GPS Tracking History</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {gpsHistory.map((location, index) => (
                  <div key={location.id} className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                      <span className="text-gray-600">Point {index + 1}</span>
                      {location.speed_kmh && (
                        <span className="ml-2 text-gray-500">- {location.speed_kmh} km/h</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(location.recorded_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Admin Actions */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Admin Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={handleCreateIncident}
              >
                <FileText className="w-4 h-4 mr-2" />
                Create Incident
              </Button>

              {!['COMPLETED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_SYSTEM'].includes(selectedTrip.status) && (
                <Button
                  variant="secondary"
                  onClick={handleCancelTrip}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Cancel Trip
                </Button>
              )}
            </div>

            {selectedTrip.admin_notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-900 mb-1">Admin Notes</p>
                <p className="text-sm text-gray-600">{selectedTrip.admin_notes}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al panel
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Monitoreo de Viajes</h1>
          <p className="text-gray-600">Supervisión en tiempo real de todos los viajes</p>
        </div>

        {/* Live Map */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Mapa en Tiempo Real</h2>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseRealMap(!useRealMap)}
              >
                <Map className="w-4 h-4 mr-2" />
                {useRealMap ? 'Mapa Simple' : 'Mapa Real (OSM)'}
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-600">En vivo</span>
              </div>
            </div>
          </div>
          {useRealMap ? (
            <LeafletMap className="h-[400px]" />
          ) : (
            <LiveMap className="h-[400px]" />
          )}
        </Card>

        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'active' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
          >
            Activos
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
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todos
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando viajes...</p>
            </div>
          </div>
        ) : trips.length === 0 ? (
          <Card className="text-center py-12">
            <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No hay viajes</h2>
            <p className="text-gray-600">
              {filter === 'active' && 'No hay viajes activos en este momento'}
              {filter === 'completed' && 'No hay viajes completados'}
              {filter === 'cancelled' && 'No hay viajes cancelados'}
              {filter === 'all' && 'No hay viajes registrados'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => {
              const driver = trip.driver;
              const driverProfile = driver?.user_profile;
              const passenger = trip.passenger;
              const passengerProfile = passenger?.user_profile;

              return (
                <Card
                  key={trip.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedTrip(trip)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-600" />
                      <p className="text-sm text-gray-600">
                        {new Date(trip.requested_at).toLocaleString('es-AR')}
                      </p>
                    </div>
                    {getStatusBadge(trip.status)}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div className="space-y-2">
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
                          <p className="text-sm text-gray-900 truncate">
                            {trip.destination_address}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Pasajero</p>
                        <p className="text-sm font-medium text-gray-900">
                          {passengerProfile?.full_name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Conductor</p>
                        <p className="text-sm font-medium text-gray-900">
                          {driverProfile?.full_name || 'Sin asignar'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Distancia</p>
                        <p className="text-sm font-medium text-gray-900">
                          {trip.actual_distance_km || trip.estimated_distance_km || 0} km
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Tarifa</p>
                        <p className="text-sm font-medium text-gray-900">
                          ${trip.final_fare || trip.estimated_fare || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="mt-6 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Actualización en Tiempo Real</h3>
              <p className="text-sm text-blue-800">
                La lista de viajes se actualiza automáticamente cada 5 segundos para mostrar el
                estado más reciente de todos los viajes en la plataforma.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
