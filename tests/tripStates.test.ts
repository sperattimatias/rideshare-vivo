import test from 'node:test';
import assert from 'node:assert/strict';
import { canAcceptTrip, canTransitionTo, getNextDriverStatus } from '../src/lib/tripStates.js';

test('trip acceptance solo permitido en REQUESTED', () => {
  assert.equal(canAcceptTrip('REQUESTED'), true);
  assert.equal(canAcceptTrip('ACCEPTED'), false);
  assert.equal(canAcceptTrip('IN_PROGRESS'), false);
});

test('transiciones de estado válidas e inválidas', () => {
  assert.equal(canTransitionTo('REQUESTED', 'ACCEPTED'), true);
  assert.equal(canTransitionTo('REQUESTED', 'COMPLETED'), false);
  assert.equal(canTransitionTo('IN_PROGRESS', 'COMPLETED'), true);
  assert.equal(canTransitionTo('COMPLETED', 'IN_PROGRESS'), false);
});

test('siguiente estado del conductor', () => {
  assert.equal(getNextDriverStatus('ACCEPTED'), 'DRIVER_ARRIVING');
  assert.equal(getNextDriverStatus('DRIVER_ARRIVED'), 'IN_PROGRESS');
  assert.equal(getNextDriverStatus('COMPLETED'), null);
});
