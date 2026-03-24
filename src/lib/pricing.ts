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

export function getPricingConfig(): PricingConfig {
  return DEFAULT_PRICING;
}
