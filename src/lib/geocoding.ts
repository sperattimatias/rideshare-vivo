export interface Coordinates {
  lat: number;
  lon: number;
}

export interface AddressResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface GeocodeResult {
  success: boolean;
  address?: string;
  coordinates?: Coordinates;
  suggestions?: Array<{
    display_name: string;
    coordinates: Coordinates;
  }>;
  error?: string;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const ROSARIO_BOUNDS = {
  minLat: -33.1,
  maxLat: -32.8,
  minLon: -60.9,
  maxLon: -60.5
};

const CACHE_DURATION_MS = 1000 * 60 * 60;
const geocodeCache = new Map<string, { result: GeocodeResult; timestamp: number }>();

function getCacheKey(address: string): string {
  return address.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getCachedResult(address: string): GeocodeResult | null {
  const key = getCacheKey(address);
  const cached = geocodeCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.result;
  }

  if (cached) {
    geocodeCache.delete(key);
  }

  return null;
}

function setCachedResult(address: string, result: GeocodeResult): void {
  const key = getCacheKey(address);
  geocodeCache.set(key, {
    result,
    timestamp: Date.now()
  });
}

async function searchNominatim(query: string): Promise<AddressResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'ar',
    bounded: '1',
    viewbox: `${ROSARIO_BOUNDS.minLon},${ROSARIO_BOUNDS.minLat},${ROSARIO_BOUNDS.maxLon},${ROSARIO_BOUNDS.maxLat}`
  });

  const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'VIVO-Platform-Rosario/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Error de geocodificación: ${response.statusText}`);
  }

  return response.json();
}

function isInRosarioArea(lat: number, lon: number): boolean {
  return lat >= ROSARIO_BOUNDS.minLat &&
         lat <= ROSARIO_BOUNDS.maxLat &&
         lon >= ROSARIO_BOUNDS.minLon &&
         lon <= ROSARIO_BOUNDS.maxLon;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  if (!address || address.trim().length < 3) {
    return {
      success: false,
      error: 'Ingresá al menos 3 caracteres para buscar una dirección'
    };
  }

  const cached = getCachedResult(address);
  if (cached) {
    return cached;
  }

  try {
    const cleanQuery = `${address.trim()}, Rosario, Santa Fe, Argentina`;
    const results = await searchNominatim(cleanQuery);

    if (!results || results.length === 0) {
      const fallbackQuery = `${address.trim()}, Rosario, Argentina`;
      const fallbackResults = await searchNominatim(fallbackQuery);

      if (!fallbackResults || fallbackResults.length === 0) {
        const result: GeocodeResult = {
          success: false,
          error: 'No se encontraron resultados. Intentá con otra dirección o lugar conocido de Rosario.'
        };
        setCachedResult(address, result);
        return result;
      }

      return processResults(fallbackResults, address);
    }

    return processResults(results, address);

  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: 'Error al buscar la dirección. Verificá tu conexión e intentá nuevamente.'
    };
  }
}

function processResults(results: AddressResult[], originalQuery: string): GeocodeResult {
  const validResults = results
    .map(r => ({
      display_name: r.display_name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon)
    }))
    .filter(r => !isNaN(r.lat) && !isNaN(r.lon) && isInRosarioArea(r.lat, r.lon));

  if (validResults.length === 0) {
    const result: GeocodeResult = {
      success: false,
      error: 'Las direcciones encontradas están fuera del área de Rosario. Intentá con una dirección dentro de la ciudad.'
    };
    setCachedResult(originalQuery, result);
    return result;
  }

  const bestMatch = validResults[0];
  const result: GeocodeResult = {
    success: true,
    address: bestMatch.display_name,
    coordinates: {
      lat: bestMatch.lat,
      lon: bestMatch.lon
    },
    suggestions: validResults.slice(0, 3).map(r => ({
      display_name: r.display_name,
      coordinates: { lat: r.lat, lon: r.lon }
    }))
  };

  setCachedResult(originalQuery, result);
  return result;
}

export async function searchAddressSuggestions(query: string): Promise<Array<{
  display_name: string;
  coordinates: Coordinates;
}>> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  const cached = getCachedResult(query);
  if (cached?.suggestions) {
    return cached.suggestions;
  }

  try {
    const result = await geocodeAddress(query);
    return result.suggestions || [];
  } catch {
    return [];
  }
}

export function isValidCoordinates(coords: Coordinates | null | undefined): coords is Coordinates {
  if (!coords) return false;

  const { lat, lon } = coords;
  return !isNaN(lat) &&
         !isNaN(lon) &&
         lat >= -90 &&
         lat <= 90 &&
         lon >= -180 &&
         lon <= 180;
}
