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

  const pricingConfig = await getPricingConfig();
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
    const { data: completionResult, error: completionError } = await supabase.rpc('complete_trip_counters_atomic', {
      p_trip_id: tripId,
      p_driver_id: driverId,
      p_passenger_id: passengerId,
      p_actual_distance_km: completionData.actualDistanceKm,
      p_actual_duration_minutes: completionData.actualDurationMinutes,
      p_final_fare: completionData.finalFare,
    });
    if (completionError) throw new Error(`Error actualizando contadores: ${completionError.message}`);
    if (!completionResult) throw new Error('El viaje no se pudo cerrar en forma atómica');

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
