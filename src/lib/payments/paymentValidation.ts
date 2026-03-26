export interface PaymentTripSnapshot {
  tripId: string;
  passengerUserId: string;
  requesterUserId: string;
  tripStatus: string;
  finalFare: number | null;
  driverId: string | null;
  driverSellerId: string | null;
  hasActiveDriverToken: boolean;
}

export interface PaymentValidationResult {
  ok: boolean;
  reason?: string;
}

export function validatePaymentPreconditions(snapshot: PaymentTripSnapshot): PaymentValidationResult {
  if (snapshot.passengerUserId !== snapshot.requesterUserId) {
    return { ok: false, reason: 'UNAUTHORIZED_PASSENGER' };
  }

  if (snapshot.tripStatus !== 'COMPLETED') {
    return { ok: false, reason: 'INVALID_TRIP_STATUS' };
  }

  if (!snapshot.driverId || !snapshot.driverSellerId) {
    return { ok: false, reason: 'DRIVER_NOT_READY' };
  }

  if (!snapshot.finalFare || snapshot.finalFare <= 0) {
    return { ok: false, reason: 'INVALID_FINAL_FARE' };
  }

  if (!snapshot.hasActiveDriverToken) {
    return { ok: false, reason: 'MISSING_DRIVER_TOKEN' };
  }

  return { ok: true };
}
