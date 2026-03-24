import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, DollarSign, Users, Car, Calendar, Clock, Star } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';

interface PlatformAnalyticsProps {
  onBack: () => void;
}

interface AnalyticsData {
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  activeTrips: number;
  totalRevenue: number;
  platformCommission: number;
  totalDrivers: number;
  activeDrivers: number;
  totalPassengers: number;
  averageRating: number;
  tripsToday: number;
  tripsThisWeek: number;
  tripsThisMonth: number;
}

export function PlatformAnalytics({ onBack }: PlatformAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalTrips: 0,
    completedTrips: 0,
    cancelledTrips: 0,
    activeTrips: 0,
    totalRevenue: 0,
    platformCommission: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    totalPassengers: 0,
    averageRating: 0,
    tripsToday: 0,
    tripsThisWeek: 0,
    tripsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: trips } = await supabase.from('trips').select('*');

      const { data: drivers } = await supabase.from('drivers').select('*');

      const { data: passengers } = await supabase.from('passengers').select('*');

      const { data: payments } = await supabase.from('trip_payments').select('*');

      const { data: ratings } = await supabase.from('ratings').select('rating');

      const completedTrips = trips?.filter((t) => t.status === 'COMPLETED') || [];
      const cancelledTrips =
        trips?.filter((t) =>
          ['CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_SYSTEM'].includes(
            t.status
          )
        ) || [];
      const activeTrips =
        trips?.filter((t) =>
          ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(
            t.status
          )
        ) || [];

      const tripsToday =
        trips?.filter((t) => new Date(t.requested_at) >= today).length || 0;
      const tripsThisWeek =
        trips?.filter((t) => new Date(t.requested_at) >= weekAgo).length || 0;
      const tripsThisMonth =
        trips?.filter((t) => new Date(t.requested_at) >= monthStart).length || 0;

      const totalRevenue =
        payments?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;
      const platformCommission =
        payments?.reduce((sum, p) => sum + (p.platform_commission || 0), 0) || 0;

      const activeDrivers =
        drivers?.filter(
          (d) => d.is_online && d.status === 'ACTIVE'
        ).length || 0;

      const averageRating =
        ratings && ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          : 0;

      setAnalytics({
        totalTrips: trips?.length || 0,
        completedTrips: completedTrips.length,
        cancelledTrips: cancelledTrips.length,
        activeTrips: activeTrips.length,
        totalRevenue,
        platformCommission,
        totalDrivers: drivers?.length || 0,
        activeDrivers,
        totalPassengers: passengers?.length || 0,
        averageRating,
        tripsToday,
        tripsThisWeek,
        tripsThisMonth,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando análisis...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Análisis de Plataforma</h1>
          <p className="text-gray-600">Métricas y estadísticas en tiempo real</p>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={timeRange === 'today' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('today')}
          >
            Hoy
          </Button>
          <Button
            variant={timeRange === 'week' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('week')}
          >
            Esta semana
          </Button>
          <Button
            variant={timeRange === 'month' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('month')}
          >
            Este mes
          </Button>
          <Button
            variant={timeRange === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('all')}
          >
            Todo el tiempo
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-green-700 mb-1">Ingresos Totales</p>
                <p className="text-2xl font-bold text-green-900">
                  ${analytics.totalRevenue.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-blue-700 mb-1">Comisión Plataforma</p>
                <p className="text-2xl font-bold text-blue-900">
                  ${analytics.platformCommission.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Viajes Completados</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.completedTrips}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Viajes Activos</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.activeTrips}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Conductores</h3>
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Total registrados</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalDrivers}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Activos ahora</p>
                <p className="text-xl font-semibold text-green-600">{analytics.activeDrivers}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Pasajeros</h3>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Total registrados</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalPassengers}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Calificación Promedio</h3>
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Global de conductores</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.averageRating.toFixed(1)}
                  </p>
                  <Star className="w-6 h-6 text-yellow-500 fill-current" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Hoy</h3>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.tripsToday}</p>
            <p className="text-sm text-gray-600 mt-1">viajes</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Esta Semana</h3>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.tripsThisWeek}</p>
            <p className="text-sm text-gray-600 mt-1">viajes</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Este Mes</h3>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.tripsThisMonth}</p>
            <p className="text-sm text-gray-600 mt-1">viajes</p>
          </Card>
        </div>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Resumen de Viajes</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Total</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalTrips}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Completados</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-green-600">{analytics.completedTrips}</p>
                <span className="text-sm text-gray-500">
                  (
                  {analytics.totalTrips > 0
                    ? ((analytics.completedTrips / analytics.totalTrips) * 100).toFixed(1)
                    : 0}
                  %)
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Cancelados</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-red-600">{analytics.cancelledTrips}</p>
                <span className="text-sm text-gray-500">
                  (
                  {analytics.totalTrips > 0
                    ? ((analytics.cancelledTrips / analytics.totalTrips) * 100).toFixed(1)
                    : 0}
                  %)
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Activos</p>
              <p className="text-2xl font-bold text-yellow-600">{analytics.activeTrips}</p>
            </div>
          </div>
        </Card>

        <Card className="mt-6 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Actualización Automática</h3>
              <p className="text-sm text-blue-800">
                Los datos se actualizan automáticamente cada 30 segundos para reflejar el estado
                actual de la plataforma en tiempo real.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
