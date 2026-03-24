import type { MapProvider } from './types';
import { NominatimProvider } from './providers/nominatim';
import { MapboxProvider } from './providers/mapbox';
import { getMapsConfig } from './config';

export * from './types';

let mapProviderInstance: MapProvider | null = null;

async function createMapProvider(): Promise<MapProvider> {
  const config = await getMapsConfig();

  switch (config.provider) {
    case 'mapbox':
      if (!config.mapboxToken) {
        console.warn('Mapbox token no configurado. Usando Nominatim como fallback.');
        return new NominatimProvider();
      }
      return new MapboxProvider({ apiKey: config.mapboxToken });

    case 'google':
      if (!config.googleMapsApiKey) {
        console.warn('Google Maps API key no configurada. Usando Nominatim como fallback.');
        return new NominatimProvider();
      }
      console.warn('Google Maps provider no implementado todavía. Usando Nominatim como fallback.');
      return new NominatimProvider();

    case 'nominatim':
    default:
      return new NominatimProvider();
  }
}

async function getMapProvider(): Promise<MapProvider> {
  if (!mapProviderInstance) {
    mapProviderInstance = await createMapProvider();
  }
  return mapProviderInstance;
}

export async function geocodeAddress(address: string) {
  const provider = await getMapProvider();
  return provider.geocode(address);
}

export async function reverseGeocodeCoordinates(lat: number, lon: number) {
  const provider = await getMapProvider();
  return provider.reverseGeocode(lat, lon);
}

export async function searchAddressSuggestions(
  query: string,
  options?: {
    limit?: number;
    bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  }
) {
  const provider = await getMapProvider();
  return provider.searchSuggestions(query, options);
}

export async function calculateRoute(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  options?: { alternatives?: boolean; steps?: boolean }
) {
  const provider = await getMapProvider();
  return provider.calculateRoute(origin, destination, options);
}

export async function getStaticMapUrl(options: {
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
  const provider = await getMapProvider();
  return provider.getStaticMapUrl(options);
}

export function isValidCoordinates(
  coords: { lat: number; lon: number } | null | undefined
): coords is { lat: number; lon: number } {
  if (!coords) return false;

  const { lat, lon } = coords;
  return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}
