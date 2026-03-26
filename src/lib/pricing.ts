import { supabase } from './supabase';
import { calculateDriverEarningsAmount, calculateFareAmount } from './pricingMath';

export interface PricingConfig {
  baseFare: number;
  perKmRate: number;
  minimumFare?: number;
  nightSurcharge?: number;
  peakHourMultiplier?: number;
}

const FALLBACK_PRICING: PricingConfig = {
  baseFare: 500,
  perKmRate: 150,
  minimumFare: 500,
};

let cachedPricing: PricingConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export async function getPricingConfig(): Promise<PricingConfig> {
  if (cachedPricing && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedPricing;
  }

  try {
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      cachedPricing = {
        baseFare: data.base_fare,
        perKmRate: data.per_km_rate,
        minimumFare: data.minimum_fare ?? undefined,
        peakHourMultiplier: data.surge_multiplier ?? undefined,
      };
      cacheTimestamp = Date.now();
      return cachedPricing;
    }
  } catch (err) {
    console.error('Error fetching pricing rules, using fallback:', err);
  }

  return FALLBACK_PRICING;
}

export function calculateFare(distanceKm: number, config: PricingConfig): number {
  return calculateFareAmount(distanceKm, config);
}

export function calculateDriverEarnings(fare: number, platformCommission = 0.20): number {
  return calculateDriverEarningsAmount(fare, platformCommission);
}

export function clearPricingCache() {
  cachedPricing = null;
  cacheTimestamp = 0;
}
