import { supabase } from './supabase';
import { calculateDistanceKm, calculateEstimatedDurationMinutes } from './geo';
import { fromDbGeographyPoint } from './geospatial';

export interface DriverScore {
  driver_id: string;
  score: number;
  acceptance_rate: number;
  cancellation_rate: number;
  completion_rate: number;
  average_rating: number;
  total_trips: number;
  incident_count: number;
  days_since_last_incident: number;
  last_calculated: string;
}

export interface MatchingConfig {
  id: string;
  name: string;
  is_active: boolean;
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
  entity_id?: string;
  title: string;
  description: string;
  data?: unknown;
  is_resolved: boolean;
  created_at: string;
}

export interface DemandAnalytics {
  zone_name: string;
  latitude: number;
  longitude: number;
  date: string;
  hour: number;
  trip_count: number;
  avg_wait_time_seconds: number;
  avg_fare: number;
}

// DRIVER SCORE MANAGEMENT

export async function calculateDriverScore(driverId: string): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_driver_score', {
    p_driver_id: driverId,
  });

  if (error) throw error;
  return data;
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
  return data;
}

export async function updateMatchingConfig(
  configId: string,
  updates: Partial<MatchingConfig>
): Promise<MatchingConfig> {
  const { data, error } = await supabase
    .from('matching_config')
    .update(updates)
    .eq('id', configId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setActiveConfig(configId: string): Promise<void> {
  // Deactivate all configs
  await supabase.from('matching_config').update({ is_active: false }).neq('id', '');

  // Activate selected config
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

  // Get available drivers
  const { data: availableDrivers } = await supabase
    .from('drivers')
    .select(
      `
      id,
      user_id,
      current_location,
      vehicle_brand,
      vehicle_model,
      vehicle_plate,
      user_profiles!inner(full_name),
      driver_scores!inner(score, average_rating)
    `
    )
    .eq('status', 'ACTIVE')
    .eq('is_online', true)
    .eq('is_on_trip', false);

  if (!availableDrivers || availableDrivers.length === 0) {
    return [];
  }

  // Get passenger trip history with drivers
  const { data: tripHistory } = await supabase
    .from('trips')
    .select('driver_id, status')
    .eq('passenger_id', passengerId)
    .eq('status', 'COMPLETED');

  const driverTripCounts = new Map<string, number>();
  tripHistory?.forEach((trip) => {
    if (trip.driver_id) {
      driverTripCounts.set(trip.driver_id, (driverTripCounts.get(trip.driver_id) || 0) + 1);
    }
  });

  // Calculate matching scores
  const matches: DriverMatch[] = [];

  for (const driver of availableDrivers) {
    const scoreData = Array.isArray(driver.driver_scores)
      ? driver.driver_scores[0]
      : driver.driver_scores;
    const driverScore = scoreData?.score || 0;
    const driverRating = scoreData?.average_rating || 5.0;

    // Apply trust mode filter
    if (trustModeEnabled && driverScore < config.trust_mode_threshold) {
      continue;
    }

    // Apply minimum score threshold
    if (driverScore < config.min_score_threshold) {
      continue;
    }

    // Calculate distance
    const location = fromDbGeographyPoint(driver.current_location);
    if (!location) continue;

    const distance = calculateDistanceKm(
      passengerLat,
      passengerLon,
      location.lat,
      location.lon
    );

    // Skip if too far
    if (distance > config.max_distance_km) {
      continue;
    }

    // Calculate component scores (normalized 0-100)
    const distanceScore = Math.max(0, 100 - (distance / config.max_distance_km) * 100);
    const scoreComponent = driverScore;
    const ratingScore = (driverRating / 5.0) * 100;
    const historyCount = driverTripCounts.get(driver.id) || 0;
    const historyScore = Math.min(100, historyCount * 20); // +20 per previous trip, max 100

    // Weighted matching score
    const matchingScore =
      distanceScore * config.distance_weight +
      scoreComponent * config.score_weight +
      ratingScore * config.rating_weight +
      historyScore * config.history_weight;

    const eta = calculateEstimatedDurationMinutes(distance);
    const profile = Array.isArray(driver.user_profiles)
      ? driver.user_profiles[0]
      : driver.user_profiles;

    matches.push({
      driver_id: driver.id,
      driver_name: profile?.full_name || 'Conductor',
      vehicle_info: `${driver.vehicle_brand} ${driver.vehicle_model} - ${driver.vehicle_plate}`,
      distance_km: Math.round(distance * 100) / 100,
      score: driverScore,
      rating: driverRating,
      matching_score: Math.round(matchingScore * 100) / 100,
      eta_minutes: eta,
    });
  }

  // Sort by matching score (highest first)
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
  data?: unknown
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
  latitude: number,
  longitude: number,
  tripCount: number,
  avgWaitTime: number,
  avgFare: number
): Promise<void> {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const hour = now.getHours();

  const { error } = await supabase
    .from('trip_demand_analytics')
    .upsert(
      {
        zone_name: zoneName,
        latitude,
        longitude,
        date,
        hour,
        trip_count: tripCount,
        avg_wait_time_seconds: avgWaitTime,
        avg_fare: avgFare,
      },
      {
        onConflict: 'zone_name,date,hour',
      }
    );

  if (error) throw error;
}

export async function getDemandHeatmap(
  startDate: string,
  endDate: string
): Promise<DemandAnalytics[]> {
  const { data, error } = await supabase
    .from('trip_demand_analytics')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('trip_count', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getDemandByZone(zoneName: string): Promise<DemandAnalytics[]> {
  const { data, error } = await supabase
    .from('trip_demand_analytics')
    .select('*')
    .eq('zone_name', zoneName)
    .order('date', { ascending: false })
    .limit(168); // Last 7 days * 24 hours

  if (error) throw error;
  return data || [];
}

export async function getHotZones(limit: number = 10): Promise<DemandAnalytics[]> {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('trip_demand_analytics')
    .select('*')
    .gte('date', weekAgo)
    .lte('date', today)
    .order('trip_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ANALYTICS AGGREGATION (Called periodically)

export async function aggregateTripDemand(date?: string): Promise<void> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  // This would typically be run as a scheduled job
  // For now, it's a placeholder for the aggregation logic
  const { data: trips } = await supabase
    .from('trips')
    .select('origin_latitude, origin_longitude, requested_at, accepted_at, final_fare')
    .gte('requested_at', `${targetDate}T00:00:00`)
    .lt('requested_at', `${targetDate}T23:59:59`)
    .not('origin_latitude', 'is', null)
    .not('origin_longitude', 'is', null);

  if (!trips || trips.length === 0) return;

  // Simple zone detection (would be more sophisticated in production)
  const zones = new Map<string, { trips: unknown[]; lat: number; lon: number }>();

  trips.forEach((trip) => {
    // Round to 2 decimals for zone grouping (~1km precision)
    const zoneLat = Math.round(trip.origin_latitude * 100) / 100;
    const zoneLon = Math.round(trip.origin_longitude * 100) / 100;
    const zoneKey = `${zoneLat},${zoneLon}`;

    if (!zones.has(zoneKey)) {
      zones.set(zoneKey, {
        trips: [],
        lat: trip.origin_latitude,
        lon: trip.origin_longitude,
      });
    }
    zones.get(zoneKey)!.trips.push(trip);
  });

  // Aggregate by hour for each zone
  for (const [zoneKey, zoneData] of zones) {
    const hourlyData = new Map<number, typeof trips>();

    zoneData.trips.forEach((trip) => {
      const hour = new Date(trip.requested_at).getHours();
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, []);
      }
      hourlyData.get(hour)!.push(trip);
    });

    for (const [, hourTrips] of hourlyData) {
      const avgWait =
        hourTrips
          .filter((t) => t.accepted_at)
          .reduce((sum, t) => {
            const wait =
              (new Date(t.accepted_at).getTime() - new Date(t.requested_at).getTime()) / 1000;
            return sum + wait;
          }, 0) / hourTrips.length || 0;

      const avgFare =
        hourTrips.reduce((sum, t) => sum + (t.final_fare || 0), 0) / hourTrips.length || 0;

      await updateDemandAnalytics(
        `Zone ${zoneKey}`,
        zoneData.lat,
        zoneData.lon,
        hourTrips.length,
        Math.round(avgWait),
        Math.round(avgFare * 100) / 100
      );
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
    supabase
      .from('drivers')
      .select('count')
      .eq('is_online', true)
      .eq('status', 'ACTIVE'),
  ]);

  return {
    unresolved_alerts: unresolvedAlerts.data?.[0]?.count || 0,
    low_score_drivers: lowScoreDrivers.data?.[0]?.count || 0,
    active_trips: activeTrips.data?.[0]?.count || 0,
    online_drivers: onlineDrivers.data?.[0]?.count || 0,
    timestamp: now.toISOString(),
  };
}
