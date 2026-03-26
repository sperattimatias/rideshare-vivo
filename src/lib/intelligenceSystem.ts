import { supabase } from './supabase';
import { calculateDistanceKm, calculateEstimatedDurationMinutes } from './geo';
import { fromDbGeographyPoint } from './geospatial';
import type { Database, Json } from './database.types';

export interface DriverScore {
  id: string;
  driver_id: string;
  score: number;
  metrics: Json;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface MatchingConfig {
  id: string;
  city: string;
  max_search_radius_km: number;
  max_wait_time_seconds: number;
  score_weights: Json;
  trust_mode_bonus: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Campos de UI legacy
  distance_weight: number;
  score_weight: number;
  rating_weight: number;
  history_weight: number;
  min_score_threshold: number;
  trust_mode_threshold: number;
  max_distance_km: number;
}

export interface DriverMatch {
  driver_id: string;
  driver_name: string;
  vehicle_info: string;
  distance_km: number;
  score: number;
  rating: number;
  matching_score: number;
  eta_minutes: number;
}

export interface IntelligentAlert {
  id: string;
  alert_type: string;
  severity: string;
  entity_type: string;
  entity_id: string;
  title: string;
  description: string;
  data: Json | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface DemandAnalytics {
  id: string;
  zone_name: string;
  demand_level: number;
  active_drivers: number;
  requested_trips: number;
  avg_wait_time_seconds: number;
  timestamp_hour: string;
  created_at: string;
  // Campos derivados para UI legacy
  latitude: number;
  longitude: number;
  date: string;
  hour: number;
  trip_count: number;
  avg_fare: number;
}

interface ScoreWeights {
  distance_weight: number;
  score_weight: number;
  rating_weight: number;
  history_weight: number;
  min_score_threshold: number;
  trust_mode_threshold: number;
}

interface DriverAvailabilityRow {
  id: string;
  user_id: string;
  current_location: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
}

const isJsonObject = (value: Json): value is Record<string, Json> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getNumber = (obj: Record<string, Json>, key: string, fallback: number): number => {
  const value = obj[key];
  return typeof value === 'number' ? value : fallback;
};

const parseScoreWeights = (value: Json): ScoreWeights => {
  if (!isJsonObject(value)) {
    return {
      distance_weight: 0.35,
      score_weight: 0.35,
      rating_weight: 0.2,
      history_weight: 0.1,
      min_score_threshold: 0,
      trust_mode_threshold: 80,
    };
  }

  return {
    distance_weight: getNumber(value, 'distance_weight', 0.35),
    score_weight: getNumber(value, 'score_weight', 0.35),
    rating_weight: getNumber(value, 'rating_weight', 0.2),
    history_weight: getNumber(value, 'history_weight', 0.1),
    min_score_threshold: getNumber(value, 'min_score_threshold', 0),
    trust_mode_threshold: getNumber(value, 'trust_mode_threshold', 80),
  };
};

const mapMatchingConfigRow = (
  row: Database['public']['Tables']['matching_config']['Row']
): MatchingConfig => {
  const weights = parseScoreWeights(row.score_weights);
  return {
    ...row,
    distance_weight: weights.distance_weight,
    score_weight: weights.score_weight,
    rating_weight: weights.rating_weight,
    history_weight: weights.history_weight,
    min_score_threshold: weights.min_score_threshold,
    trust_mode_threshold: weights.trust_mode_threshold,
    max_distance_km: row.max_search_radius_km,
  };
};

const getAverageRatingFromMetrics = (metrics: Json): number => {
  if (!isJsonObject(metrics)) return 5;
  const rating = metrics.average_rating;
  return typeof rating === 'number' ? rating : 5;
};

// DRIVER SCORE MANAGEMENT

export async function calculateDriverScore(driverId: string): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_driver_score', {
    p_driver_id: driverId,
  });

  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

export async function getDriverScore(driverId: string): Promise<DriverScore | null> {
  const { data, error } = await supabase
    .from('driver_scores')
    .select('*')
    .eq('driver_id', driverId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function recalculateAllScores(): Promise<void> {
  const { data: drivers } = await supabase.from('drivers').select('id');

  if (drivers) {
    for (const driver of drivers) {
      await calculateDriverScore(driver.id);
    }
  }
}

// INTELLIGENT MATCHING

export async function getActiveMatchingConfig(): Promise<MatchingConfig | null> {
  const { data, error } = await supabase
    .from('matching_config')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data ? mapMatchingConfigRow(data) : null;
}

export async function updateMatchingConfig(
  configId: string,
  updates: Partial<MatchingConfig>
): Promise<MatchingConfig> {
  const scoreWeights = {
    distance_weight: updates.distance_weight,
    score_weight: updates.score_weight,
    rating_weight: updates.rating_weight,
    history_weight: updates.history_weight,
    min_score_threshold: updates.min_score_threshold,
    trust_mode_threshold: updates.trust_mode_threshold,
  };

  const dbUpdates: Database['public']['Tables']['matching_config']['Update'] = {
    city: updates.city,
    max_search_radius_km: updates.max_distance_km ?? updates.max_search_radius_km,
    max_wait_time_seconds: updates.max_wait_time_seconds,
    trust_mode_bonus: updates.trust_mode_bonus,
    is_active: updates.is_active,
  };

  if (Object.values(scoreWeights).some((value) => typeof value === 'number')) {
    dbUpdates.score_weights = {
      distance_weight: scoreWeights.distance_weight ?? 0.35,
      score_weight: scoreWeights.score_weight ?? 0.35,
      rating_weight: scoreWeights.rating_weight ?? 0.2,
      history_weight: scoreWeights.history_weight ?? 0.1,
      min_score_threshold: scoreWeights.min_score_threshold ?? 0,
      trust_mode_threshold: scoreWeights.trust_mode_threshold ?? 80,
    };
  } else if (updates.score_weights) {
    dbUpdates.score_weights = updates.score_weights;
  }

  const { data, error } = await supabase
    .from('matching_config')
    .update(dbUpdates)
    .eq('id', configId)
    .select()
    .single();

  if (error) throw error;
  return mapMatchingConfigRow(data);
}

export async function setActiveConfig(configId: string): Promise<void> {
  await supabase.from('matching_config').update({ is_active: false }).neq('id', '');
  await supabase.from('matching_config').update({ is_active: true }).eq('id', configId);
}

export async function findBestDriverMatch(
  passengerLat: number,
  passengerLon: number,
  passengerId: string,
  trustModeEnabled: boolean = false
): Promise<DriverMatch[]> {
  const config = await getActiveMatchingConfig();
  if (!config) throw new Error('No active matching configuration');

  const weights = parseScoreWeights(config.score_weights);

  const { data: availableDrivers } = await supabase
    .from('drivers')
    .select(`
      id,
      user_id,
      current_location,
      vehicle_brand,
      vehicle_model,
      vehicle_plate
    `)
    .eq('status', 'ACTIVE')
    .eq('is_online', true)
    .eq('is_on_trip', false);

  if (!availableDrivers || availableDrivers.length === 0) {
    return [];
  }

  const { data: tripHistory } = await supabase
    .from('trips')
    .select('driver_id')
    .eq('passenger_id', passengerId)
    .eq('status', 'COMPLETED');

  const driverTripCounts = new Map<string, number>();
  tripHistory?.forEach((trip) => {
    if (trip.driver_id) {
      driverTripCounts.set(trip.driver_id, (driverTripCounts.get(trip.driver_id) ?? 0) + 1);
    }
  });

  const matches: DriverMatch[] = [];

  const driverIds = availableDrivers.map((driver) => driver.id);
  const driverUserIds = availableDrivers.map((driver) => driver.user_id);
  const [{ data: scoreRows }, { data: profileRows }] = await Promise.all([
    supabase.from('driver_scores').select('driver_id, score, metrics').in('driver_id', driverIds),
    supabase.from('user_profiles').select('id, full_name').in('id', driverUserIds),
  ]);
  const scoreByDriverId = new Map((scoreRows ?? []).map((row) => [row.driver_id, row]));
  const nameByUserId = new Map((profileRows ?? []).map((row) => [row.id, row.full_name]));

  for (const driver of (availableDrivers ?? []) as DriverAvailabilityRow[]) {
    const scoreData = scoreByDriverId.get(driver.id);
    const driverScore = scoreData?.score ?? 0;
    const driverRating = scoreData ? getAverageRatingFromMetrics(scoreData.metrics) : 5;

    if (trustModeEnabled && driverScore < weights.trust_mode_threshold) {
      continue;
    }

    if (driverScore < weights.min_score_threshold) {
      continue;
    }

    const location = fromDbGeographyPoint(driver.current_location);
    if (!location) continue;

    const distance = calculateDistanceKm(passengerLat, passengerLon, location.lat, location.lon);

    if (distance > config.max_search_radius_km) {
      continue;
    }

    const distanceScore = Math.max(0, 100 - (distance / config.max_search_radius_km) * 100);
    const ratingScore = (driverRating / 5) * 100;
    const historyCount = driverTripCounts.get(driver.id) ?? 0;
    const historyScore = Math.min(100, historyCount * 20);

    const matchingScore =
      distanceScore * weights.distance_weight +
      driverScore * weights.score_weight +
      ratingScore * weights.rating_weight +
      historyScore * weights.history_weight;

    matches.push({
      driver_id: driver.id,
      driver_name: nameByUserId.get(driver.user_id) ?? 'Conductor',
      vehicle_info: `${driver.vehicle_brand ?? ''} ${driver.vehicle_model ?? ''} - ${driver.vehicle_plate ?? ''}`.trim(),
      distance_km: Math.round(distance * 100) / 100,
      score: driverScore,
      rating: driverRating,
      matching_score: Math.round(matchingScore * 100) / 100,
      eta_minutes: calculateEstimatedDurationMinutes(distance),
    });
  }

  matches.sort((a, b) => b.matching_score - a.matching_score);

  return matches;
}

// INTELLIGENT ALERTS

export async function getUnresolvedAlerts(): Promise<IntelligentAlert[]> {
  const { data, error } = await supabase
    .from('intelligent_alerts')
    .select('*')
    .eq('is_resolved', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAlertsByEntity(
  entityType: string,
  entityId: string
): Promise<IntelligentAlert[]> {
  const { data, error } = await supabase
    .from('intelligent_alerts')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function resolveAlert(alertId: string, adminId: string): Promise<void> {
  const { error } = await supabase
    .from('intelligent_alerts')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: adminId,
    })
    .eq('id', alertId);

  if (error) throw error;
}

export async function checkDriverAlerts(driverId: string): Promise<void> {
  await supabase.rpc('check_driver_performance_alerts', {
    p_driver_id: driverId,
  });
}

export async function createManualAlert(
  alertType: string,
  severity: string,
  entityType: string,
  entityId: string,
  title: string,
  description: string,
  data?: Json
): Promise<IntelligentAlert> {
  const { data: alert, error } = await supabase
    .from('intelligent_alerts')
    .insert({
      alert_type: alertType,
      severity,
      entity_type: entityType,
      entity_id: entityId,
      title,
      description,
      data,
    })
    .select()
    .single();

  if (error) throw error;
  return alert;
}

// DEMAND ANALYTICS

export async function updateDemandAnalytics(
  zoneName: string,
  demandLevel: number,
  activeDrivers: number,
  requestedTrips: number,
  avgWaitTime: number
): Promise<void> {
  const { error } = await supabase.from('trip_demand_analytics').insert({
    zone_name: zoneName,
    demand_level: demandLevel,
    active_drivers: activeDrivers,
    requested_trips: requestedTrips,
    avg_wait_time_seconds: avgWaitTime,
  });

  if (error) throw error;
}

export async function getDemandHeatmap(
  startDate: string,
  endDate: string
): Promise<DemandAnalytics[]> {
  const { data, error } = await supabase
    .from('trip_demand_analytics')
    .select('*')
    .gte('timestamp_hour', `${startDate}T00:00:00`)
    .lte('timestamp_hour', `${endDate}T23:59:59`)
    .order('requested_trips', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    latitude: 0,
    longitude: 0,
    date: row.timestamp_hour.split('T')[0],
    hour: new Date(row.timestamp_hour).getHours(),
    trip_count: row.requested_trips,
    avg_fare: 0,
  }));
}

export async function getDemandByZone(zoneName: string): Promise<DemandAnalytics[]> {
  const { data, error } = await supabase
    .from('trip_demand_analytics')
    .select('*')
    .eq('zone_name', zoneName)
    .order('timestamp_hour', { ascending: false })
    .limit(168);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    latitude: 0,
    longitude: 0,
    date: row.timestamp_hour.split('T')[0],
    hour: new Date(row.timestamp_hour).getHours(),
    trip_count: row.requested_trips,
    avg_fare: 0,
  }));
}

export async function getHotZones(limit: number = 10): Promise<DemandAnalytics[]> {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('trip_demand_analytics')
    .select('*')
    .gte('timestamp_hour', `${weekAgo}T00:00:00`)
    .lte('timestamp_hour', `${today}T23:59:59`)
    .order('requested_trips', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    latitude: 0,
    longitude: 0,
    date: row.timestamp_hour.split('T')[0],
    hour: new Date(row.timestamp_hour).getHours(),
    trip_count: row.requested_trips,
    avg_fare: 0,
  }));
}

export async function aggregateTripDemand(date?: string): Promise<void> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const { data: trips } = await supabase
    .from('trips')
    .select('origin_latitude, origin_longitude, requested_at, accepted_at')
    .gte('requested_at', `${targetDate}T00:00:00`)
    .lt('requested_at', `${targetDate}T23:59:59`)
    .not('origin_latitude', 'is', null)
    .not('origin_longitude', 'is', null);

  if (!trips || trips.length === 0) return;

  const zones = new Map<string, { trips: Array<{ requested_at: string; accepted_at: string | null }>; lat: number; lon: number }>();

  trips.forEach((trip) => {
    if (trip.origin_latitude === null || trip.origin_longitude === null) return;

    const zoneLat = Math.round(trip.origin_latitude * 100) / 100;
    const zoneLon = Math.round(trip.origin_longitude * 100) / 100;
    const zoneKey = `${zoneLat},${zoneLon}`;

    if (!zones.has(zoneKey)) {
      zones.set(zoneKey, {
        trips: [],
        lat: zoneLat,
        lon: zoneLon,
      });
    }

    zones.get(zoneKey)?.trips.push({
      requested_at: trip.requested_at,
      accepted_at: trip.accepted_at,
    });
  });

  for (const [zoneKey, zoneData] of zones) {
    const hourlyData = new Map<number, Array<{ requested_at: string; accepted_at: string | null }>>();

    zoneData.trips.forEach((trip) => {
      const hour = new Date(trip.requested_at).getHours();
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, []);
      }
      hourlyData.get(hour)?.push(trip);
    });

    for (const [, hourTrips] of hourlyData) {
      const acceptedTrips = hourTrips.filter((trip) => trip.accepted_at !== null);
      const totalWaitSeconds = acceptedTrips.reduce((sum, trip) => {
        if (!trip.accepted_at) return sum;
        return sum + (new Date(trip.accepted_at).getTime() - new Date(trip.requested_at).getTime()) / 1000;
      }, 0);

      const avgWait = acceptedTrips.length > 0 ? totalWaitSeconds / acceptedTrips.length : 0;
      const demandLevel = Math.max(0, Math.min(100, Math.round(hourTrips.length * 10)));

      await updateDemandAnalytics(`Zone ${zoneKey}`, demandLevel, 0, hourTrips.length, Math.round(avgWait));
    }
  }
}

// PERFORMANCE MONITORING

export async function getSystemHealthMetrics() {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [unresolvedAlerts, lowScoreDrivers, activeTrips, onlineDrivers] = await Promise.all([
    supabase
      .from('intelligent_alerts')
      .select('count')
      .eq('is_resolved', false)
      .gte('created_at', hourAgo.toISOString()),
    supabase.from('driver_scores').select('count').lt('score', 70),
    supabase.from('trips').select('count').in('status', ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS']),
    supabase.from('drivers').select('count').eq('is_online', true).eq('status', 'ACTIVE'),
  ]);

  return {
    unresolved_alerts: unresolvedAlerts.count ?? 0,
    low_score_drivers: lowScoreDrivers.count ?? 0,
    active_trips: activeTrips.count ?? 0,
    online_drivers: onlineDrivers.count ?? 0,
    timestamp: now.toISOString(),
  };
}
