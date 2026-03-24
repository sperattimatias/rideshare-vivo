import { supabase } from './supabase';
import { calculateFare, calculateDriverEarnings, getPricingConfig } from './pricing';
import type { Database } from './database.types';

type TripRow = Database['public']['Tables']['trips']['Row'];

export interface TripCompletionData {
  actualDistanceKm: number;
  actualDurationMinutes: number;
  finalFare: number;
  driverEarnings: number;
  platformFee: number;
}

export async function calculateTripCompletion(
  trip: TripRow,
  actualDistanceKm: number
): Promise<TripCompletionData> {
  const startTime = trip.started_at ? new Date(trip.started_at) : new Date(trip.accepted_at);
  const actualDurationMinutes = Math.floor((Date.now() - startTime.getTime()) / 60000);

  const pricingConfig = getPricingConfig();
  const finalFare = calculateFare(actualDistanceKm, pricingConfig);

  const driverEarnings = calculateDriverEarnings(finalFare);
  const platformFee = finalFare - driverEarnings;

  return {
    actualDistanceKm,
    actualDurationMinutes,
    finalFare,
    driverEarnings,
    platformFee,
  };
}

export async function completeTripTransaction(
  tripId: string,
  driverId: string,
  passengerId: string,
  completionData: TripCompletionData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: tripError } = await supabase
      .from('trips')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        actual_distance_km: completionData.actualDistanceKm,
        actual_duration_minutes: completionData.actualDurationMinutes,
        final_fare: completionData.finalFare,
      })
      .eq('id', tripId)
      .eq('status', 'IN_PROGRESS');

    if (tripError) {
      throw new Error(`Error actualizando viaje: ${tripError.message}`);
    }

    const { data: driverData, error: driverFetchError } = await supabase
      .from('drivers')
      .select('total_trips, total_earnings')
      .eq('id', driverId)
      .maybeSingle();

    if (driverFetchError) {
      throw new Error(`Error obteniendo datos del conductor: ${driverFetchError.message}`);
    }

    const { error: driverUpdateError } = await supabase
      .from('drivers')
      .update({
        is_on_trip: false,
        total_trips: (driverData?.total_trips || 0) + 1,
        total_earnings: (driverData?.total_earnings || 0) + completionData.driverEarnings,
      })
      .eq('id', driverId);

    if (driverUpdateError) {
      throw new Error(`Error actualizando conductor: ${driverUpdateError.message}`);
    }

    const { data: passengerData, error: passengerFetchError } = await supabase
      .from('passengers')
      .select('total_trips')
      .eq('id', passengerId)
      .maybeSingle();

    if (passengerFetchError) {
      console.warn('Error obteniendo datos del pasajero:', passengerFetchError);
    }

    if (passengerData) {
      const { error: passengerUpdateError } = await supabase
        .from('passengers')
        .update({
          total_trips: passengerData.total_trips + 1,
        })
        .eq('id', passengerId);

      if (passengerUpdateError) {
        console.warn('Error actualizando pasajero:', passengerUpdateError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error en completeTripTransaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

export function validateTripCompletion(trip: TripRow): { valid: boolean; error?: string } {
  if (trip.status !== 'IN_PROGRESS') {
    return {
      valid: false,
      error: 'El viaje debe estar en curso para finalizarlo',
    };
  }

  if (!trip.started_at) {
    return {
      valid: false,
      error: 'El viaje no tiene hora de inicio',
    };
  }

  return { valid: true };
}
