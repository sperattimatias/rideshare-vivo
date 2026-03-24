import { supabase } from './supabase';

export interface PricingConfig {
  baseFare: number;
  perKmRate: number;
  minimumFare?: number;
  nightSurcharge?: number;
  peakHourMultiplier?: number;
}

const DEFAULT_PRICING: PricingConfig = {
  baseFare: 500,
  perKmRate: 150,
  minimumFare: 500,
};

export function calculateFare(distanceKm: number, config: PricingConfig = DEFAULT_PRICING): number {
  if (distanceKm < 0) {
    throw new Error('Distancia inválida');
  }

  const calculatedFare = config.baseFare + (distanceKm * config.perKmRate);

  if (config.minimumFare && calculatedFare < config.minimumFare) {
    return config.minimumFare;
  }

  return Math.round(calculatedFare);
}

export function calculateDriverEarnings(fare: number, platformCommission: number = 0.20): number {
  return Math.round(fare * (1 - platformCommission));
}

let cachedPricingConfig: PricingConfig | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

export async function getPricingConfig(forceRefresh = false): Promise<PricingConfig> {
  const now = Date.now();
  if (!forceRefresh && cachedPricingConfig && now - cachedAt < CACHE_TTL_MS) {
    return cachedPricingConfig;
  }

  try {
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('base_fare, per_km_rate, minimum_fare')
      .eq('is_active', true)
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return DEFAULT_PRICING;
    }

    cachedPricingConfig = {
      baseFare: Number(data.base_fare ?? DEFAULT_PRICING.baseFare),
      perKmRate: Number(data.per_km_rate ?? DEFAULT_PRICING.perKmRate),
      minimumFare: Number(data.minimum_fare ?? DEFAULT_PRICING.minimumFare),
    };
    cachedAt = now;
    return cachedPricingConfig;
  } catch (error) {
    console.error('Error loading pricing config, using defaults:', error);
    return DEFAULT_PRICING;
  }
}
