import { useState, useEffect } from 'react';
import {
  Users,
  Car,
  AlertCircle,
  MapPin,
  Clock,
  ArrowLeft,
  Map,
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { getOperationalDashboard } from '../../lib/adminOperations';
import { LiveMap } from '../../components/LiveMap';
import { LeafletMap } from '../../components/LeafletMap';

interface DashboardStats {
  activeTrips: unknown[];
  openIncidents: unknown[];
  driversStatus: unknown[];
}

interface OperationalDashboardProps {
  onBack: () => void;
}

export default function OperationalDashboard({ onBack }: OperationalDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    activeTrips: [],
    openIncidents: [],
    driversStatus: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [useRealMap, setUseRealMap] = useState(false);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => {
      loadDashboard();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  async function loadDashboard() {
    try {
      const data = await getOperationalDashboard();
      setStats(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalDrivers = stats.driversStatus.reduce((sum, item) => sum + (item.count || 0), 0);
  const onlineDrivers = stats.driversStatus.reduce(
    (sum, item) => sum + (item.online_count || 0),
    0
  );
  const activeDrivers = stats.driversStatus.reduce(
    (sum, item) => sum + (item.on_trip_count || 0),
    0
  );

  const criticalIncidents = stats.openIncidents.filter(
    (i) => i.severity === 'CRITICAL'
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando panel de operaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Panel
          </Button>

          <Breadcrumbs
            items={[
              { label: 'Admin', onClick: onBack },
              { label: 'Centro de Operaciones' }
            ]}
          />

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Centro de Operaciones</h1>
              <p className="text-gray-600 mt-1">Monitoreo de plataforma en tiempo real</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Última actualización</p>
              <p className="text-sm font-medium text-gray-900">
                {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Live Map */}
        <Card className="mb-6">
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
            <LeafletMap className="h-[500px]" />
          ) : (
            <LiveMap className="h-[500px]" />
          )}
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">Viajes Activos</p>
                <p className="text-3xl font-bold">{stats.activeTrips.length}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm mb-1">Conductores en Línea</p>
                <p className="text-3xl font-bold">{onlineDrivers}</p>
                <p className="text-xs text-green-100 mt-1">
                  {activeDrivers} en viaje
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-1">Incidentes Abiertos</p>
                <p className="text-3xl font-bold">{stats.openIncidents.length}</p>
                <p className="text-xs text-orange-100 mt-1">
                  {criticalIncidents} críticos
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm mb-1">Total Conductores</p>
                <p className="text-3xl font-bold">{totalDrivers}</p>
                <p className="text-xs text-purple-100 mt-1">
                  {onlineDrivers > 0
                    ? `${Math.round((onlineDrivers / totalDrivers) * 100)}% en línea`
                    : '0% en línea'}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Active Trips */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Viajes Activos</h2>
              <Button variant="outline" size="sm">
                Ver Todos
              </Button>
            </div>

            {stats.activeTrips.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No hay viajes activos</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats.activeTrips.slice(0, 5).map((trip) => (
                  <div
                    key={trip.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">
                          {trip.passenger_name}
                        </p>
                        <p className="text-xs text-gray-600">{trip.driver_name || 'Esperando conductor'}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          trip.status === 'REQUESTED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : trip.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {trip.status === 'REQUESTED' ? 'SOLICITADO' : trip.status === 'IN_PROGRESS' ? 'EN PROGRESO' : trip.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>
                        hace {Math.round(trip.minutes_since_request)} min
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Open Incidents */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Incidentes Abiertos</h2>
              <Button variant="outline" size="sm">
                Ver Todos
              </Button>
            </div>

            {stats.openIncidents.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No hay incidentes abiertos</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats.openIncidents.slice(0, 5).map((incident) => (
                  <div
                    key={incident.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">
                          {incident.title}
                        </p>
                        <p className="text-xs text-gray-600">{incident.incident_type}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          incident.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-800'
                            : incident.severity === 'HIGH'
                            ? 'bg-orange-100 text-orange-800'
                            : incident.severity === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {incident.severity === 'CRITICAL' ? 'CRÍTICO' : incident.severity === 'HIGH' ? 'ALTO' : incident.severity === 'MEDIUM' ? 'MEDIO' : 'BAJO'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>{Math.round(incident.hours_open)}h abierto</span>
                      </div>
                      {incident.assigned_admin_name && (
                        <span>Asignado a {incident.assigned_admin_name}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Driver Status Breakdown */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Estado de Conductores</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.driversStatus.map((status) => (
              <div
                key={status.status}
                className="p-4 bg-gray-50 rounded-lg"
              >
                <p className="text-sm text-gray-600 mb-1">{status.status}</p>
                <p className="text-2xl font-bold text-gray-900">{status.count}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {status.online_count} en línea
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Real-time indicator */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Actualización automática cada 10 segundos</span>
        </div>
      </div>
    </div>
  );
}
