import { useState, useEffect } from 'react';
import { MapPin, Clock, CreditCard, Car, User, AlertCircle, History } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { RequestRide } from './passenger/RequestRide';
import { ActiveRide } from './passenger/ActiveRide';
import { RideHistory } from './passenger/RideHistory';
import { RateTrip } from './passenger/RateTrip';
import type { Database } from '../lib/database.types';

type TripRow = Database['public']['Tables']['trips']['Row'];
type PassengerRow = Database['public']['Tables']['passengers']['Row'];

export function PassengerDashboard() {
  const { profile, signOut } = useAuth();
  const [view, setView] = useState<'dashboard' | 'request' | 'active' | 'history' | 'rate'>('dashboard');
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>();
  const [passenger, setPassenger] = useState<PassengerRow | null>(null);
  const [activeTrip, setActiveTrip] = useState<TripRow | null>(null);
  const [recentTrips, setRecentTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPassengerData();
    const interval = setInterval(fetchPassengerData, 10000);
    return () => clearInterval(interval);
  }, [profile]);

  const fetchPassengerData = async () => {
    if (!profile) return;

    try {
      const { data: passengerData, error: passengerError } = await supabase
        .from('passengers')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (passengerError) throw passengerError;
      setPassenger(passengerData);

      if (passengerData) {
        const { data: activeTrips } = await supabase
          .from('trips')
          .select('*')
          .eq('passenger_id', passengerData.id)
          .in('status', ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'])
          .order('requested_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setActiveTrip(activeTrips);

        const { data: recent } = await supabase
          .from('trips')
          .select('*')
          .eq('passenger_id', passengerData.id)
          .in('status', ['COMPLETED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER'])
          .order('requested_at', { ascending: false })
          .limit(3);

        setRecentTrips(recent || []);
      }
    } catch (error) {
      console.error('Error fetching passenger data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSuccess = () => {
    setView('dashboard');
    fetchPassengerData();
  };

  const handleRateTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setView('rate');
  };

  const handleRateComplete = () => {
    setView('history');
    fetchPassengerData();
  };

  const handleViewTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setView('active');
  };

  if (view === 'request') {
    return <RequestRide onBack={() => setView('dashboard')} onSuccess={handleRequestSuccess} />;
  }

  if (view === 'active') {
    return <ActiveRide onBack={() => setView('dashboard')} tripId={selectedTripId} />;
  }

  if (view === 'history') {
    return (
      <RideHistory
        onBack={() => setView('dashboard')}
        onRateTrip={handleRateTrip}
        onViewTrip={handleViewTrip}
      />
    );
  }

  if (view === 'rate' && selectedTripId) {
    return (
      <RateTrip
        tripId={selectedTripId}
        onBack={() => setView('history')}
        onComplete={handleRateComplete}
      />
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">VIVO</h1>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors">
              <User className="w-5 h-5" />
              <span className="hidden sm:inline">{profile?.full_name}</span>
            </button>
            <Button variant="outline" size="sm" onClick={signOut}>
              Salir
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTrip && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 shadow-md">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                  <Car className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 mb-2 text-lg">Tenés un viaje activo</h3>
                <p className="text-blue-800 mb-1 font-medium">
                  {activeTrip.status === 'REQUESTED' && 'Buscando conductor disponible...'}
                  {activeTrip.status === 'ACCEPTED' && 'Conductor asignado y en camino'}
                  {activeTrip.status === 'DRIVER_ARRIVING' && 'El conductor está llegando'}
                  {activeTrip.status === 'DRIVER_ARRIVED' && 'Tu conductor llegó al punto de encuentro'}
                  {activeTrip.status === 'IN_PROGRESS' && 'Viaje en curso hacia tu destino'}
                </p>
                <p className="text-sm text-blue-700 mb-4">
                  Origen: {activeTrip.origin_address}
                </p>
                <Button variant="primary" size="sm" onClick={() => setView('active')}>
                  Ver detalles del viaje
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Solicitar viaje</h2>
            </div>
            <p className="text-gray-600 mb-6">
              ¿A dónde querés ir? Ingresá tu origen y destino para solicitar un viaje.
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setView('request')}
              disabled={!!activeTrip}
            >
              {activeTrip ? 'Ya tenés un viaje activo' : 'Solicitar viaje ahora'}
            </Button>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold">Viajes recientes</h2>
              </div>
              {recentTrips.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setView('history')}>
                  <History className="w-4 h-4 mr-1" />
                  Ver todos
                </Button>
              )}
            </div>

            {recentTrips.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No tenés viajes recientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleViewTrip(trip.id)}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-900 truncate flex-1">{trip.origin_address}</p>
                    </div>
                    <div className="flex items-start gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-900 truncate flex-1">
                        {trip.destination_address}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{new Date(trip.requested_at).toLocaleDateString('es-AR')}</span>
                      <span className="font-semibold text-gray-900">
                        ${trip.final_fare || trip.estimated_fare}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold">Método de pago</h2>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <img
                src="https://images.pexels.com/photos/50987/money-card-business-credit-card-50987.jpeg?auto=compress&cs=tinysrgb&w=100"
                alt="Mercado Pago"
                className="w-12 h-8 object-cover rounded"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Mercado Pago</p>
                <p className="text-xs text-gray-600">Predeterminado</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  El pago se procesa automáticamente al finalizar cada viaje
                </p>
              </div>
            </div>
          </Card>

          {passenger && (
            <Card className="col-span-2 bg-gray-50">
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{passenger.total_trips}</p>
                  <p className="text-sm text-gray-600">Viajes totales</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {activeTrip ? 1 : 0}
                  </p>
                  <p className="text-sm text-gray-600">Viajes activos</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {recentTrips.filter((t) => t.status === 'COMPLETED').length}
                  </p>
                  <p className="text-sm text-gray-600">Completados recientes</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
