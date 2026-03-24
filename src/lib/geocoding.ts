export interface AddressCoordinates {
  address: string;
  lat: number;
  lon: number;
}

export interface GeocodeResult {
  success: boolean;
  coordinates?: AddressCoordinates;
  error?: string;
}

const KNOWN_ADDRESSES: Record<string, { lat: number; lon: number }> = {
  'rosario centro': { lat: -32.9468, lon: -60.6393 },
  'centro rosario': { lat: -32.9468, lon: -60.6393 },
  'plaza 25 de mayo rosario': { lat: -32.9442, lon: -60.6505 },
  'monumento a la bandera': { lat: -32.9477, lon: -60.6309 },
  'parque independencia rosario': { lat: -32.9542, lon: -60.6398 },
  'barrio fisherton': { lat: -32.9589, lon: -60.6893 },
  'aeropuerto rosario': { lat: -32.9036, lon: -60.7850 },
  'estacion rosario norte': { lat: -32.9346, lon: -60.6441 },
  'terminal de omnibus rosario': { lat: -32.9346, lon: -60.6441 },
  'puerto rosario': { lat: -32.9272, lon: -60.6424 },
  'barrio pichincha': { lat: -32.9623, lon: -60.6502 },
  'barrio alberdi': { lat: -32.9589, lon: -60.6689 },
  'barrio lisandro de la torre': { lat: -32.9832, lon: -60.6562 },
  'shopping alto rosario': { lat: -32.9789, lon: -60.6428 },
  'shopping del siglo': { lat: -32.9542, lon: -60.6689 },
};

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function findKnownAddress(address: string): { lat: number; lon: number } | null {
  const normalized = normalizeAddress(address);

  const exact = KNOWN_ADDRESSES[normalized];
  if (exact) return exact;

  for (const [key, value] of Object.entries(KNOWN_ADDRESSES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return null;
}

function parseCoordinatesFromAddress(address: string): { lat: number; lon: number } | null {
  const coordPattern = /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/;
  const match = address.match(coordPattern);

  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);

    if (!isNaN(lat) && !isNaN(lon) &&
        lat >= -90 && lat <= 90 &&
        lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }

  return null;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  if (!address || address.trim().length === 0) {
    return {
      success: false,
      error: 'La dirección no puede estar vacía'
    };
  }

  const coordsFromInput = parseCoordinatesFromAddress(address);
  if (coordsFromInput) {
    return {
      success: true,
      coordinates: {
        address: address.trim(),
        ...coordsFromInput
      }
    };
  }

  const knownLocation = findKnownAddress(address);
  if (knownLocation) {
    return {
      success: true,
      coordinates: {
        address: address.trim(),
        ...knownLocation
      }
    };
  }

  return {
    success: false,
    error: 'No se pudo geocodificar la dirección. Ingresá una dirección conocida de Rosario o coordenadas en formato: lat, lon'
  };
}

export function isValidAddress(address: string): boolean {
  if (!address || address.trim().length === 0) {
    return false;
  }

  if (parseCoordinatesFromAddress(address)) {
    return true;
  }

  if (findKnownAddress(address)) {
    return true;
  }

  return false;
}
