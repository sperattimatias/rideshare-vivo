import { supabase } from '../../lib/supabase';
import { fromDbGeographyPoint } from '../../lib/geospatial';
import { isValidCoordinate } from '../../lib/geo';
import type { Database } from '../../lib/database.types';

type TripRow = Database['public']['Tables']['trips']['Row'];
type PassengerRow = Database['public']['Tables']['passengers']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

export interface TripWithDetails extends TripRow {
  passenger?: PassengerRow & { user_profile?: UserProfileRow };
}

export interface TripAcceptanceResult {
  success: boolean;
  code: string;
  message: string;
  trip_id: string | null;
  driver_id: string | null;
}

export async function getDriverLocation(driverId: string): Promise<{ lat: number; lon: number } | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select('current_location')
    .eq('id', driverId)
    .single();

  if (error) {
    throw error;
  }

  if (!data?.current_location) {
    return null;
  }

  const location = fromDbGeographyPoint(data.current_location);
  if (!location || !isValidCoordinate(location.lat, location.lon)) {
    return null;
  }

  return location;
}

export async function getPendingTripRequests(): Promise<TripWithDetails[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      passenger:passengers(
        *,
        user_profile:user_profiles(*)
      )
    `)
    .eq('status', 'REQUESTED')
    .is('driver_id', null)
    .order('requested_at', { ascending: true })
    .limit(5);

  if (error) {
    throw error;
  }

  return (data ?? []) as TripWithDetails[];
}

export async function acceptTrip(tripId: string): Promise<TripAcceptanceResult> {
  const { data, error } = await supabase.rpc('accept_trip', {
    p_trip_id: tripId,
  });

  if (error) {
    throw error;
  }

  return (data?.[0] as TripAcceptanceResult | undefined) ?? {
    success: false,
    code: 'UNKNOWN',
    message: 'No se pudo aceptar el viaje',
    trip_id: null,
    driver_id: null,
  };
}
