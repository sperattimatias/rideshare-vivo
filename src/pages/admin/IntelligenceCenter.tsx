import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, TrendingUp, MapPin, Settings, RefreshCw, ArrowLeft } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getUnresolvedAlerts,
  resolveAlert,
  getSystemHealthMetrics,
  getActiveMatchingConfig,
  updateMatchingConfig,
  type IntelligentAlert,
  type MatchingConfig,
} from '../../lib/intelligenceSystem';
import { getCurrentAdmin } from '../../lib/adminOperations';

interface IntelligenceCenterProps {
  onBack: () => void;
}

export default function IntelligenceCenter({ onBack }: IntelligenceCenterProps) {
  const [alerts, setAlerts] = useState<IntelligentAlert[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<any>(null);
  const [matchingConfig, setMatchingConfig] = useState<MatchingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'alerts' | 'matching' | 'health'>('alerts');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [alertsData, metricsData, configData] = await Promise.all([
        getUnresolvedAlerts(),
        getSystemHealthMetrics(),
        getActiveMatchingConfig(),
      ]);

      setAlerts(alertsData);
      setHealthMetrics(metricsData);
      setMatchingConfig(configData);
    } catch (error) {
      console.error('Error loading intelligence data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolveAlert(alertId: string) {
    try {
      const admin = await getCurrentAdmin();
      await resolveAlert(alertId, admin.id);
      await loadData();
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Failed to resolve alert');
    }
  }

  async function handleUpdateConfig() {
    if (!matchingConfig) return;

    try {
      await updateMatchingConfig(matchingConfig.id, matchingConfig);
      alert('Matching configuration updated successfully');
    } catch (error) {
      console.error('Error updating config:', error);
      alert('Failed to update configuration');
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const highAlerts = alerts.filter((a) => a.severity === 'HIGH').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading intelligence center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Panel
        </Button>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="w-8 h-8 text-blue-600" />
              Centro de Inteligencia
            </h1>
            <p className="text-gray-600 mt-1">Monitoreo y optimización de plataforma con IA</p>
          </div>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm mb-1">Alertas Sin Resolver</p>
                <p className="text-3xl font-bold">{healthMetrics?.unresolved_alerts || 0}</p>
                <p className="text-xs text-red-100 mt-1">
                  {criticalAlerts} críticas, {highAlerts} altas
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-white/30" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-1">Conductores Bajo Puntaje</p>
                <p className="text-3xl font-bold">{healthMetrics?.low_score_drivers || 0}</p>
                <p className="text-xs text-orange-100 mt-1">Requieren atención</p>
              </div>
              <TrendingUp className="w-10 h-10 text-white/30" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">Viajes Activos</p>
                <p className="text-3xl font-bold">{healthMetrics?.active_trips || 0}</p>
                <p className="text-xs text-blue-100 mt-1">En progreso ahora</p>
              </div>
              <MapPin className="w-10 h-10 text-white/30" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm mb-1">Conductores en Línea</p>
                <p className="text-3xl font-bold">{healthMetrics?.online_drivers || 0}</p>
                <p className="text-xs text-green-100 mt-1">Disponibles ahora</p>
              </div>
              <TrendingUp className="w-10 h-10 text-white/30" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={selectedTab === 'alerts' ? 'primary' : 'outline'}
            onClick={() => setSelectedTab('alerts')}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alertas ({alerts.length})
          </Button>
          <Button
            variant={selectedTab === 'matching' ? 'primary' : 'outline'}
            onClick={() => setSelectedTab('matching')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Config. de Emparejamiento
          </Button>
          <Button
            variant={selectedTab === 'health' ? 'primary' : 'outline'}
            onClick={() => setSelectedTab('health')}
          >
            <Brain className="w-4 h-4 mr-2" />
            Salud del Sistema
          </Button>
        </div>

        {/* Alerts Tab */}
        {selectedTab === 'alerts' && (
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <Card className="p-12 text-center">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hay alertas sin resolver</p>
                <p className="text-sm text-gray-500 mt-2">El sistema funciona correctamente</p>
              </Card>
            ) : (
              alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`p-4 border-l-4 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(
                            alert.severity
                          )}`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-xs text-gray-500">{alert.alert_type}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{alert.title}</h3>
                      <p className="text-sm text-gray-700 mb-3">{alert.description}</p>
                      {alert.data && Object.keys(alert.data).length > 0 && (
                        <div className="bg-white rounded p-3 text-xs">
                          <pre className="text-gray-600">
                            {JSON.stringify(alert.data, null, 2)}
                          </pre>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleResolveAlert(alert.id)}
                    >
                      Resolver
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Matching Config Tab */}
        {selectedTab === 'matching' && matchingConfig && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Configuración de Emparejamiento Inteligente</h2>
            <p className="text-sm text-gray-600 mb-6">
              Ajustá los pesos para optimizar el emparejamiento conductor-pasajero. Los pesos totales deben sumar 1.0
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Peso Distancia <span className="text-blue-600 font-bold">({matchingConfig.distance_weight})</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={matchingConfig.distance_weight}
                  onChange={(e) =>
                    setMatchingConfig({
                      ...matchingConfig,
                      distance_weight: parseFloat(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Cuánto priorizar conductores cercanos
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Peso Puntaje <span className="text-blue-600 font-bold">({matchingConfig.score_weight})</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={matchingConfig.score_weight}
                  onChange={(e) =>
                    setMatchingConfig({
                      ...matchingConfig,
                      score_weight: parseFloat(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Cuánto priorizar conductores con alto puntaje
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Peso Valoración <span className="text-blue-600 font-bold">({matchingConfig.rating_weight})</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={matchingConfig.rating_weight}
                  onChange={(e) =>
                    setMatchingConfig({
                      ...matchingConfig,
                      rating_weight: parseFloat(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Cuánto priorizar conductores bien valorados
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Peso Historial <span className="text-blue-600 font-bold">({matchingConfig.history_weight})</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={matchingConfig.history_weight}
                  onChange={(e) =>
                    setMatchingConfig({
                      ...matchingConfig,
                      history_weight: parseFloat(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Cuánto priorizar conductores conocidos
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Puntaje Mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={matchingConfig.min_score_threshold}
                  onChange={(e) =>
                    setMatchingConfig({
                      ...matchingConfig,
                      min_score_threshold: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Umbral Modo Confianza
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={matchingConfig.trust_mode_threshold}
                  onChange={(e) =>
                    setMatchingConfig({
                      ...matchingConfig,
                      trust_mode_threshold: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Distancia Máxima (km)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="0.5"
                  value={matchingConfig.max_distance_km}
                  onChange={(e) =>
                    setMatchingConfig({
                      ...matchingConfig,
                      max_distance_km: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 mt-6 border-t-2 border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Peso Total:{' '}
                  {(
                    matchingConfig.distance_weight +
                    matchingConfig.score_weight +
                    matchingConfig.rating_weight +
                    matchingConfig.history_weight
                  ).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">Debe ser igual a 1.00 para resultados óptimos</p>
              </div>
              <Button onClick={handleUpdateConfig}>Guardar Configuración</Button>
            </div>
          </Card>
        )}

        {/* Health Tab */}
        {selectedTab === 'health' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Estado del Sistema</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Distribución de Alertas</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Críticas</span>
                      <span className="text-sm font-medium text-red-600">{criticalAlerts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Altas</span>
                      <span className="text-sm font-medium text-orange-600">{highAlerts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Medium/Low</span>
                      <span className="text-sm font-medium text-gray-600">
                        {alerts.length - criticalAlerts - highAlerts}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Platform Health</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active Trips</span>
                      <span className="text-sm font-medium text-gray-900">
                        {healthMetrics?.active_trips}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Online Drivers</span>
                      <span className="text-sm font-medium text-gray-900">
                        {healthMetrics?.online_drivers}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Low Score Drivers</span>
                      <span className="text-sm font-medium text-orange-600">
                        {healthMetrics?.low_score_drivers}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-blue-50 border-2 border-blue-200">
              <div className="flex items-start gap-3">
                <Brain className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">AI-Powered Intelligence</h3>
                  <p className="text-sm text-blue-800 mb-3">
                    The intelligence system continuously monitors platform activity and
                    automatically generates alerts for issues requiring attention.
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Driver performance tracking with automatic scoring</li>
                    <li>Smart matching algorithm with configurable weights</li>
                    <li>Demand analytics and heatmap generation</li>
                    <li>Proactive alerts for performance issues</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
