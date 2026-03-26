import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFareAmount, calculateFareSplit } from '../src/lib/pricingMath.js';

test('calculateFareAmount aplica base + distancia y redondea', () => {
  const fare = calculateFareAmount(3.4, { baseFare: 500, perKmRate: 150, minimumFare: 500 });
  assert.equal(fare, 1010);
});

test('calculateFareAmount respeta mínimo', () => {
  const fare = calculateFareAmount(0.5, { baseFare: 100, perKmRate: 50, minimumFare: 500 });
  assert.equal(fare, 500);
});

test('calculateFareSplit divide comisión plataforma', () => {
  const split = calculateFareSplit(1000, 0.2);
  assert.deepEqual(split, { totalAmount: 1000, driverAmount: 800, platformAmount: 200 });
});

test('calculateFareSplit falla con monto inválido', () => {
  assert.throws(() => calculateFareSplit(0), /Monto total inválido/);
});
