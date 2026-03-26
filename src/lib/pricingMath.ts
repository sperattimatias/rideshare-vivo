export interface PricingConfigLike {
  baseFare: number;
  perKmRate: number;
  minimumFare?: number;
}

export interface FareSplit {
  totalAmount: number;
  platformAmount: number;
  driverAmount: number;
}

export function calculateFareAmount(distanceKm: number, config: PricingConfigLike): number {
  if (distanceKm < 0) {
    throw new Error('Distancia inválida');
  }

  const calculated = config.baseFare + distanceKm * config.perKmRate;
  const fare = typeof config.minimumFare === 'number'
    ? Math.max(calculated, config.minimumFare)
    : calculated;

  return Math.round(fare);
}

export function calculateDriverEarningsAmount(fare: number, platformCommission = 0.2): number {
  if (fare < 0) {
    throw new Error('Tarifa inválida');
  }

  if (platformCommission < 0 || platformCommission > 1) {
    throw new Error('Comisión de plataforma inválida');
  }

  return Math.round(fare * (1 - platformCommission));
}

export function calculateFareSplit(totalAmount: number, platformCommission = 0.2): FareSplit {
  if (totalAmount <= 0) {
    throw new Error('Monto total inválido');
  }

  const driverAmount = calculateDriverEarningsAmount(totalAmount, platformCommission);
  const platformAmount = Math.round(totalAmount - driverAmount);

  return {
    totalAmount: Math.round(totalAmount),
    driverAmount,
    platformAmount,
  };
}
