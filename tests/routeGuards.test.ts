import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPath, getRoleHomePath } from '../src/lib/routing/routeGuards.js';

test('home path por rol', () => {
  assert.equal(getRoleHomePath({ userType: 'PASSENGER', isAdminRecord: false }), '/passenger');
  assert.equal(getRoleHomePath({ userType: 'DRIVER', isAdminRecord: false }), '/driver');
  assert.equal(getRoleHomePath({ userType: 'PASSENGER', isAdminRecord: true }), '/admin');
});

test('guard de acceso por path', () => {
  assert.equal(canAccessPath('/admin/trips', { userType: 'PASSENGER', isAdminRecord: false }), false);
  assert.equal(canAccessPath('/driver/earnings', { userType: 'DRIVER', isAdminRecord: false }), true);
  assert.equal(canAccessPath('/passenger/history', { userType: 'DRIVER', isAdminRecord: false }), false);
});
