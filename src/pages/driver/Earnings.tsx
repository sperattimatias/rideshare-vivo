import { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, TrendingUp, Calendar, Clock, MapPin } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { calculateDriverEarnings } from '../../lib/pricing';

type TripRow = Database['public']['Tables']['trips']['Row'];

interface EarningsProps {
  driverId: string;
  onBack: () => void;
}

interface EarningsData {
  today: number;
  week: number;
  month: number;
  total: number;
}

export function Earnings({ driverId, onBack }: EarningsProps) {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [earnings, setEarnings] = useState<EarningsData>({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'week' | 'month' | 'all'>('week');

  useEffect(() => {
    fetchEarnings();
  }, [driverId]);

  const fetchEarnings = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('driver_id', driverId)
        .eq('status', 'COMPLETED')
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const earningsData: EarningsData = {
        today: 0,
        week: 0,
        month: 0,
        total: 0,
      };

      data.forEach((trip) => {
        const driverEarning = trip.final_fare ? calculateDriverEarnings(trip.final_fare) : 0;
        const tripDate = new Date(trip.completed_at || trip.requested_at);

        earningsData.total += driverEarning;

        if (tripDate >= todayStart) {
          earningsData.today += driverEarning;
        }

        if (tripDate >= weekStart) {
          earningsData.week += driverEarning;
        }

        if (tripDate >= monthStart) {
          earningsData.month += driverEarning;
        }
      });

      setEarnings(earningsData);
      setTrips(data);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTrips = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return trips.filter((trip) => {
      const tripDate = new Date(trip.completed_at || trip.requested_at);

      switch (filter) {
        case 'today':
          return tripDate >= todayStart;
        case 'week':
          return tripDate >= weekStart;
        case 'month':
          return tripDate >= monthStart;
        default:
          return true;
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando ganancias...</p>
        </div>
      </div>
    );
  }

  const filteredTrips = getFilteredTrips();
  const totalEarnings = filteredTrips.reduce(
    (sum, trip) => sum + (trip.final_fare ? calculateDriverEarnings(trip.final_fare) : 0),
    0
  );

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Ganancias</h1>
          <p className="text-gray-600">Resumen de tus ingresos como conductor</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card
            className={`cursor-pointer transition-all ${
              filter === 'today' ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
            }`}
            onClick={() => setFilter('today')}
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Hoy</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">${earnings.today}</p>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              filter === 'week' ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
            }`}
            onClick={() => setFilter('week')}
          >
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Esta Semana</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">${earnings.week}</p>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              filter === 'month' ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
            }`}
            onClick={() => setFilter('month')}
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Este Mes</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">${earnings.month}</p>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              filter === 'all' ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
            }`}
            onClick={() => setFilter('all')}
          >
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-gray-900">Total</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">${earnings.total}</p>
          </Card>
        </div>

        <Card className="mb-6 bg-green-50 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 mb-1">Ganancia del período seleccionado</p>
              <p className="text-4xl font-bold text-green-900">${totalEarnings}</p>
              <p className="text-sm text-green-700 mt-2">
                {filteredTrips.length} {filteredTrips.length === 1 ? 'viaje' : 'viajes'} completados
              </p>
            </div>
            <DollarSign className="w-16 h-16 text-green-600" />
          </div>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-900 mb-2">Información importante</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Recibís el 80% de cada tarifa, la plataforma retiene el 20%</li>
            <li>Los pagos se procesan automáticamente a través de Mercado Pago</li>
            <li>Las liquidaciones se realizan semanalmente</li>
            <li>Podés consultar el detalle de cada viaje más abajo</li>
          </ul>
        </div>

        <Card>
          <h3 className="text-lg font-semibold mb-4">
            Detalle de viajes (
            {filter === 'today' && 'Hoy'}
            {filter === 'week' && 'Última semana'}
            {filter === 'month' && 'Este mes'}
            {filter === 'all' && 'Todos'}
            )
          </h3>

          {filteredTrips.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay viajes en este período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTrips.map((trip) => {
                const driverEarning = trip.final_fare ? calculateDriverEarnings(trip.final_fare) : 0;
                const platformFee = trip.final_fare
                  ? trip.final_fare - driverEarning
                  : 0;

                return (
                  <div
                    key={trip.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">
                          {trip.completed_at &&
                            new Date(trip.completed_at).toLocaleString('es-AR')}
                        </p>

                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-900 truncate">
                              {trip.origin_address}
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-900 truncate">
                              {trip.destination_address}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-green-600">
                          +${driverEarning}
                        </p>
                        <p className="text-xs text-gray-600">Tu ganancia</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-600">Distancia</p>
                        <p className="font-medium text-gray-900">
                          {trip.actual_distance_km || trip.estimated_distance_km || 0} km
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Tarifa total</p>
                        <p className="font-medium text-gray-900">${trip.final_fare}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Comisión</p>
                        <p className="font-medium text-gray-900">-${platformFee}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
