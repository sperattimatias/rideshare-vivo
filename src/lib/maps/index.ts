import type { MapProvider } from './types';
import { NominatimProvider } from './providers/nominatim';
import { MapboxProvider } from './providers/mapbox';

export * from './types';

function createMapProvider(): MapProvider {
  const providerType = import.meta.env.VITE_MAP_PROVIDER || 'nominatim';
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  switch (providerType) {
    case 'mapbox':
      if (!mapboxToken) {
        console.warn('VITE_MAPBOX_TOKEN no configurado. Usando Nominatim como fallback.');
        return new NominatimProvider();
      }
      return new MapboxProvider({ apiKey: mapboxToken });

    case 'nominatim':
    default:
      return new NominatimProvider();
  }
}

export const mapProvider = createMapProvider();

export async function geocodeAddress(address: string) {
  return mapProvider.geocode(address);
}

export async function reverseGeocodeCoordinates(lat: number, lon: number) {
  return mapProvider.reverseGeocode(lat, lon);
}

export async function searchAddressSuggestions(
  query: string,
  options?: {
    limit?: number;
    bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  }
) {
  return mapProvider.searchSuggestions(query, options);
}

export async function calculateRoute(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  options?: { alternatives?: boolean; steps?: boolean }
) {
  return mapProvider.calculateRoute(origin, destination, options);
}

export function getStaticMapUrl(options: {
  center: { lat: number; lon: number };
  zoom?: number;
  width?: number;
  height?: number;
  markers?: Array<{
    coordinates: { lat: number; lon: number };
    label?: string;
    color?: string;
  }>;
  path?: Array<{ lat: number; lon: number }>;
}) {
  return mapProvider.getStaticMapUrl(options);
}

export function isValidCoordinates(
  coords: { lat: number; lon: number } | null | undefined
): coords is { lat: number; lon: number } {
  if (!coords) return false;

  const { lat, lon } = coords;
  return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}
