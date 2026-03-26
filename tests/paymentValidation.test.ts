import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePaymentPreconditions } from '../src/lib/payments/paymentValidation.js';

const baseSnapshot = {
  tripId: 'trip_1',
  passengerUserId: 'u1',
  requesterUserId: 'u1',
  tripStatus: 'COMPLETED',
  finalFare: 1200,
  driverId: 'd1',
  driverSellerId: 'seller_1',
  hasActiveDriverToken: true,
};

test('validación de pago exitosa cuando condiciones son válidas', () => {
  assert.deepEqual(validatePaymentPreconditions(baseSnapshot), { ok: true });
});

test('bloquea pago si usuario no es dueño del viaje', () => {
  const result = validatePaymentPreconditions({ ...baseSnapshot, requesterUserId: 'u2' });
  assert.deepEqual(result, { ok: false, reason: 'UNAUTHORIZED_PASSENGER' });
});

test('bloquea pago por estado de viaje inválido', () => {
  const result = validatePaymentPreconditions({ ...baseSnapshot, tripStatus: 'IN_PROGRESS' });
  assert.deepEqual(result, { ok: false, reason: 'INVALID_TRIP_STATUS' });
});
