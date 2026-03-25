export interface GeoPoint {
  lat: number;
  lon: number;
}

const WKT_POINT_REGEX = /^POINT\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)$/i;
const EWKT_POINT_REGEX = /^SRID=4326;POINT\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)$/i;

export function isValidGeoPoint(point: GeoPoint | null | undefined): point is GeoPoint {
  if (!point) return false;
  const { lat, lon } = point;
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function toDbGeographyPoint(point: GeoPoint): string {
  if (!isValidGeoPoint(point)) {
    throw new Error('Coordenadas inválidas para persistir en geography(Point, 4326)');
  }

  return `POINT(${point.lon} ${point.lat})`;
}

export function fromDbGeographyPoint(raw: string | null | undefined): GeoPoint | null {
  if (!raw) return null;

  const value = raw.trim();
  const ewktMatch = value.match(EWKT_POINT_REGEX);
  if (ewktMatch) {
    return parsePointParts(ewktMatch[2], ewktMatch[1]);
  }

  const wktMatch = value.match(WKT_POINT_REGEX);
  if (wktMatch) {
    return parsePointParts(wktMatch[2], wktMatch[1]);
  }

  // Backward compatibility for legacy JSON serialization in previous builds.
  if (value.startsWith('{') && value.endsWith('}')) {
    try {
      const parsed = JSON.parse(value) as { lat?: number; lng?: number; lon?: number; latitude?: number; longitude?: number };
      const lat = parsed.lat ?? parsed.latitude;
      const lon = parsed.lon ?? parsed.lng ?? parsed.longitude;
      if (typeof lat === 'number' && typeof lon === 'number') {
        const point = { lat, lon };
        return isValidGeoPoint(point) ? point : null;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function parsePointParts(latRaw: string, lonRaw: string): GeoPoint | null {
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  const point = { lat, lon };
  return isValidGeoPoint(point) ? point : null;
}
