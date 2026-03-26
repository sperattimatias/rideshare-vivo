import test from 'node:test';
import assert from 'node:assert/strict';
import { fromDbGeographyPoint, isValidGeoPoint, toDbGeographyPoint } from '../src/lib/geospatial.js';

test('valida coordenadas geográficas válidas', () => {
  assert.equal(isValidGeoPoint({ lat: -34.6037, lon: -58.3816 }), true);
  assert.equal(isValidGeoPoint({ lat: 120, lon: 0 }), false);
});

test('serializa a WKT canonical', () => {
  assert.equal(toDbGeographyPoint({ lat: -34.6, lon: -58.38 }), 'POINT(-58.38 -34.6)');
});

test('parsea WKT/EWKT y compat JSON legado', () => {
  assert.deepEqual(fromDbGeographyPoint('POINT(-58.38 -34.6)'), { lat: -34.6, lon: -58.38 });
  assert.deepEqual(fromDbGeographyPoint('SRID=4326;POINT(-58.38 -34.6)'), { lat: -34.6, lon: -58.38 });
  assert.deepEqual(fromDbGeographyPoint('{"lat":-34.6,"lng":-58.38}'), { lat: -34.6, lon: -58.38 });
});
