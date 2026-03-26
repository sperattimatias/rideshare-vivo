import { supabase } from '../../lib/supabase';
import { calculateDriverEarnings } from '../../lib/pricing';
import type { Database } from '../../lib/database.types';

type DriverRow = Database['public']['Tables']['drivers']['Row'];

export async function getDriverByUserId(userId: string): Promise<DriverRow | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDriverIdByUserId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id || null;
}

export async function getDriverWeeklyEarnings(driverId: string): Promise<number> {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const { data, error } = await supabase
    .from('trips')
    .select('final_fare')
    .eq('driver_id', driverId)
    .eq('status', 'COMPLETED')
    .gte('completed_at', weekStart.toISOString());

  if (error) {
    throw error;
  }

  return data.reduce(
    (sum, trip) => sum + (trip.final_fare ? calculateDriverEarnings(trip.final_fare) : 0),
    0,
  );
}
