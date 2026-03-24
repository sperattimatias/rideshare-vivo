import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, TrendingUp, MapPin, Settings, RefreshCw } from 'lucide-react';
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

export default function IntelligenceCenter() {
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="w-8 h-8 text-blue-600" />
              Intelligence Center
            </h1>
            <p className="text-gray-600 mt-1">AI-powered platform monitoring and optimization</p>
          </div>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm mb-1">Unresolved Alerts</p>
                <p className="text-3xl font-bold">{healthMetrics?.unresolved_alerts || 0}</p>
                <p className="text-xs text-red-100 mt-1">
                  {criticalAlerts} critical, {highAlerts} high
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-white/30" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-1">Low Score Drivers</p>
                <p className="text-3xl font-bold">{healthMetrics?.low_score_drivers || 0}</p>
                <p className="text-xs text-orange-100 mt-1">Need attention</p>
              </div>
              <TrendingUp className="w-10 h-10 text-white/30" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">Active Trips</p>
                <p className="text-3xl font-bold">{healthMetrics?.active_trips || 0}</p>
                <p className="text-xs text-blue-100 mt-1">In progress now</p>
              </div>
              <MapPin className="w-10 h-10 text-white/30" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm mb-1">Online Drivers</p>
                <p className="text-3xl font-bold">{healthMetrics?.online_drivers || 0}</p>
                <p className="text-xs text-green-100 mt-1">Available now</p>
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
            Alerts ({alerts.length})
          </Button>
          <Button
            variant={selectedTab === 'matching' ? 'primary' : 'outline'}
            onClick={() => setSelectedTab('matching')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Matching Config
          </Button>
          <Button
            variant={selectedTab === 'health' ? 'primary' : 'outline'}
            onClick={() => setSelectedTab('health')}
          >
            <Brain className="w-4 h-4 mr-2" />
            System Health
          </Button>
        </div>

        {/* Alerts Tab */}
        {selectedTab === 'alerts' && (
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <Card className="p-12 text-center">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No unresolved alerts</p>
                <p className="text-sm text-gray-500 mt-2">System is running smoothly</p>
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
                      Resolve
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
            <h2 className="text-xl font-semibold mb-4">Smart Matching Configuration</h2>
            <p className="text-sm text-gray-600 mb-6">
              Adjust weights to optimize driver-passenger matching. Total weights should equal 1.0
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distance Weight ({matchingConfig.distance_weight})
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
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How much to prioritize nearby drivers
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Score Weight ({matchingConfig.score_weight})
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
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How much to prioritize high-score drivers
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating Weight ({matchingConfig.rating_weight})
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
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How much to prioritize high-rated drivers
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  History Weight ({matchingConfig.history_weight})
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
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How much to prioritize familiar drivers
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Score
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trust Mode Threshold
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Distance (km)
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Total Weight:{' '}
                  {(
                    matchingConfig.distance_weight +
                    matchingConfig.score_weight +
                    matchingConfig.rating_weight +
                    matchingConfig.history_weight
                  ).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">Should equal 1.00 for optimal results</p>
              </div>
              <Button onClick={handleUpdateConfig}>Save Configuration</Button>
            </div>
          </Card>
        )}

        {/* Health Tab */}
        {selectedTab === 'health' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">System Status</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Alert Distribution</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Critical</span>
                      <span className="text-sm font-medium text-red-600">{criticalAlerts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">High</span>
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
