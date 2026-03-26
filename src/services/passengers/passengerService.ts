import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type PassengerRow = Database['public']['Tables']['passengers']['Row'];
type TripRow = Database['public']['Tables']['trips']['Row'];

export interface PassengerDashboardData {
  passenger: PassengerRow | null;
  activeTrip: TripRow | null;
  recentTrips: TripRow[];
}

export async function getPassengerDashboardData(userId: string): Promise<PassengerDashboardData> {
  const { data: passenger, error: passengerError } = await supabase
    .from('passengers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (passengerError) {
    throw passengerError;
  }

  if (!passenger) {
    return {
      passenger: null,
      activeTrip: null,
      recentTrips: [],
    };
  }

  const { data: activeTrip, error: activeTripError } = await supabase
    .from('trips')
    .select('*')
    .eq('passenger_id', passenger.id)
    .in('status', ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'])
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeTripError) {
    throw activeTripError;
  }

  const { data: recentTrips, error: recentTripsError } = await supabase
    .from('trips')
    .select('*')
    .eq('passenger_id', passenger.id)
    .in('status', ['COMPLETED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER'])
    .order('requested_at', { ascending: false })
    .limit(3);

  if (recentTripsError) {
    throw recentTripsError;
  }

  return {
    passenger,
    activeTrip,
    recentTrips: recentTrips || [],
  };
}
