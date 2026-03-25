import { useState, useEffect } from 'react';
import { MapPin, TrendingUp, Clock, DollarSign, RefreshCw, ArrowLeft, Map as MapIcon } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { STRINGS } from '../../lib/strings';
import { LeafletMap } from '../../components/LeafletMap';
import { LiveMap } from '../../components/LiveMap';
import {
  getDemandHeatmap,
  getHotZones,
  aggregateTripDemand,
  type DemandAnalytics,
} from '../../lib/intelligenceSystem';

interface DemandRadarProps {
  onBack: () => void;
}

export default function DemandRadar({ onBack }: DemandRadarProps) {
  const [hotZones, setHotZones] = useState<DemandAnalytics[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoneDetails, setZoneDetails] = useState<DemandAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [useRealMap, setUseRealMap] = useState(false);

  useEffect(() => {
    loadHotZones();
  }, []);

  useEffect(() => {
    if (selectedZone) {
      loadZoneDetails(selectedZone);
    }
  }, [selectedZone]);

  async function loadHotZones() {
    setLoading(true);
    try {
      const zones = await getHotZones(20);
      setHotZones(zones);
    } catch (error) {
      console.error('Error loading hot zones:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadZoneDetails(zoneName: string) {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      const data = await getDemandHeatmap(weekAgo, today);
      const filtered = data.filter((d) => d.zone_name === zoneName);
      setZoneDetails(filtered);
    } catch (error) {
      console.error('Error loading zone details:', error);
    }
  }

  async function handleAggregateToday() {
    try {
      await aggregateTripDemand();
      await loadHotZones();
      alert('Demand data aggregated successfully');
    } catch (error) {
      console.error('Error aggregating demand:', error);
      alert('Failed to aggregate demand data');
    }
  }

  const getHeatColor = (tripCount: number) => {
    if (tripCount >= 20) return 'bg-red-500';
    if (tripCount >= 10) return 'bg-orange-500';
    if (tripCount >= 5) return 'bg-yellow-500';
    if (tripCount >= 2) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getHeatIntensity = (tripCount: number) => {
    if (tripCount >= 20) return 100;
    if (tripCount >= 10) return 75;
    if (tripCount >= 5) return 50;
    if (tripCount >= 2) return 25;
    return 10;
  };

  // Group hot zones by unique zone
  const uniqueZones = Array.from(
    new Map(hotZones.map((zone) => [zone.zone_name, zone])).values()
  );

  // Aggregate trip counts for each zone
  const zoneTotals = new Map<string, number>();
  hotZones.forEach((zone) => {
    const current = zoneTotals.get(zone.zone_name) || 0;
    zoneTotals.set(zone.zone_name, current + zone.trip_count);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{STRINGS.messages.loadingDemandRadar}</p>
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

        <Breadcrumbs
          items={[
            { label: 'Admin', onClick: onBack },
            { label: 'Radar de Demanda' }
          ]}
        />

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MapPin className="w-8 h-8 text-blue-600" />
              Radar de Demanda
            </h1>
            <p className="text-gray-600 mt-1">Análisis de demanda y mapa de calor por zonas</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setUseRealMap(!useRealMap)}
            >
              <MapIcon className="w-4 h-4 mr-2" />
              {useRealMap ? 'Mapa Simple' : 'Mapa Real (OSM)'}
            </Button>
            <Button variant="outline" onClick={loadHotZones}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button onClick={handleAggregateToday}>Agregar Hoy</Button>
          </div>
        </div>

        {/* Legend */}
        <Card className="p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Intensidad de Calor</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">Bajo (1-2 viajes)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Medio (2-5 viajes)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-600">Alto (5-10 viajes)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-sm text-gray-600">Muy Alto (10-20 viajes)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600">Extremo (20+ viajes)</span>
            </div>
          </div>
        </Card>

        {/* Live Map */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Mapa de Demanda en Tiempo Real</h2>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseRealMap(!useRealMap)}
              >
                <MapIcon className="w-4 h-4 mr-2" />
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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Hot Zones List */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <h2 className="font-semibold text-gray-900 mb-4">
                Zonas Calientes (Últimos 7 Días)
              </h2>
              <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
                {uniqueZones.map((zone) => {
                  const total = zoneTotals.get(zone.zone_name) || 0;
                  return (
                    <div
                      key={zone.zone_name}
                      onClick={() => setSelectedZone(zone.zone_name)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedZone === zone.zone_name
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${getHeatColor(total)}`}
                          ></div>
                          <span className="font-medium text-sm text-gray-900">
                            {zone.zone_name}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-gray-600">
                          {total} viajes
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.round(zone.avg_wait_time_seconds / 60)}m espera
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />$
                          {zone.avg_fare.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {uniqueZones.length === 0 && (
                  <div className="text-center py-8">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">No hay datos de demanda disponibles</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Hacé click en "Agregar Hoy" para generar datos
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Zone Details */}
          <div className="lg:col-span-2">
            {selectedZone ? (
              <div className="space-y-4">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    {selectedZone}
                  </h2>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Total Trips</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {zoneTotals.get(selectedZone) || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Avg Wait Time</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.round(
                          zoneDetails.reduce((sum, d) => sum + d.avg_wait_time_seconds, 0) /
                            zoneDetails.length /
                            60
                        )}
                        m
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Avg Fare</p>
                      <p className="text-2xl font-bold text-gray-900">
                        $
                        {(
                          zoneDetails.reduce((sum, d) => sum + d.avg_fare, 0) /
                          zoneDetails.length
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Hourly Breakdown */}
                  <h3 className="font-semibold text-gray-900 mb-3">24-Hour Activity</h3>
                  <div className="grid grid-cols-12 gap-1">
                    {Array.from({ length: 24 }, (_, hour) => {
                      const hourData = zoneDetails.filter((d) => d.hour === hour);
                      const tripCount = hourData.reduce((sum, d) => sum + d.trip_count, 0);
                      const intensity = getHeatIntensity(tripCount);

                      return (
                        <div key={hour} className="text-center">
                          <div
                            className={`h-16 ${getHeatColor(
                              tripCount
                            )} rounded relative group cursor-pointer`}
                            style={{ opacity: intensity / 100 }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                              <span className="text-white text-xs font-semibold">
                                {tripCount}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 mt-1 block">
                            {hour}h
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Peak Hours */}
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Peak Hours</h3>
                  <div className="space-y-2">
                    {zoneDetails
                      .sort((a, b) => b.trip_count - a.trip_count)
                      .slice(0, 5)
                      .map((data) => (
                        <div
                          key={`${data.date}-${data.hour}`}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {data.hour}:00 - {data.hour + 1}:00
                            </p>
                            <p className="text-xs text-gray-600">
                              {new Date(data.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {data.trip_count} trips
                            </p>
                            <p className="text-xs text-gray-600">
                              ${data.avg_fare.toFixed(2)} avg
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="p-12 text-center">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Select a Zone
                </h3>
                <p className="text-gray-600">
                  Choose a hot zone from the list to view detailed analytics
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Info Card */}
        <Card className="mt-6 p-4 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Demand Analytics</h3>
              <p className="text-sm text-blue-800">
                The demand radar aggregates trip data by zone and time to identify high-demand
                areas. This helps optimize driver deployment and predict busy periods. Click
                "Aggregate Today" to update the data with today's trips.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
