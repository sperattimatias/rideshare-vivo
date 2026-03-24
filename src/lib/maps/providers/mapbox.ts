import type {
  MapProvider,
  MapProviderConfig,
  Coordinates,
  GeocodeResult,
  ReverseGeocodeResult,
  Suggestion,
  RouteResult,
  StaticMapOptions,
} from '../types';

const MAPBOX_BASE_URL = 'https://api.mapbox.com';

const ROSARIO_BOUNDS = {
  minLat: -33.1,
  maxLat: -32.8,
  minLon: -60.9,
  maxLon: -60.5,
};

const ROSARIO_CENTER = {
  lat: -32.95,
  lon: -60.65,
};

const CACHE_DURATION_MS = 1000 * 60 * 60;
const geocodeCache = new Map<string, { result: any; timestamp: number }>();

export class MapboxProvider implements MapProvider {
  name = 'mapbox';
  private config: MapProviderConfig;
  private accessToken: string;

  constructor(config: MapProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Mapbox API key is required');
    }

    this.accessToken = config.apiKey;
    this.config = {
      baseUrl: config.baseUrl || MAPBOX_BASE_URL,
      timeout: config.timeout || 10000,
      ...config,
    };
  }

  private getCacheKey(key: string): string {
    return key.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private getCachedResult<T>(key: string): T | null {
    const cacheKey = this.getCacheKey(key);
    const cached = geocodeCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      return cached.result as T;
    }

    if (cached) {
      geocodeCache.delete(cacheKey);
    }

    return null;
  }

  private setCachedResult(key: string, result: any): void {
    const cacheKey = this.getCacheKey(key);
    geocodeCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });
  }

  private isInRosarioArea(lat: number, lon: number): boolean {
    return (
      lat >= ROSARIO_BOUNDS.minLat &&
      lat <= ROSARIO_BOUNDS.maxLat &&
      lon >= ROSARIO_BOUNDS.minLon &&
      lon <= ROSARIO_BOUNDS.maxLon
    );
  }

  async geocode(address: string): Promise<GeocodeResult> {
    if (!address || address.trim().length < 3) {
      return {
        success: false,
        error: 'Ingresá al menos 3 caracteres para buscar una dirección',
      };
    }

    const cached = this.getCachedResult<GeocodeResult>(address);
    if (cached) {
      return cached;
    }

    try {
      const query = encodeURIComponent(`${address.trim()}, Rosario, Santa Fe, Argentina`);
      const bbox = `${ROSARIO_BOUNDS.minLon},${ROSARIO_BOUNDS.minLat},${ROSARIO_BOUNDS.maxLon},${ROSARIO_BOUNDS.maxLat}`;
      const proximity = `${ROSARIO_CENTER.lon},${ROSARIO_CENTER.lat}`;

      const url = `${this.config.baseUrl}/geocoding/v5/mapbox.places/${query}.json?access_token=${this.accessToken}&bbox=${bbox}&proximity=${proximity}&limit=5&country=AR&language=es`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        const result: GeocodeResult = {
          success: false,
          error: 'No se encontraron resultados. Intentá con otra dirección o lugar conocido de Rosario.',
        };
        this.setCachedResult(address, result);
        return result;
      }

      const validResults = data.features
        .map((feature: any) => ({
          id: feature.id,
          displayName: feature.place_name,
          address: feature.place_name,
          coordinates: {
            lat: feature.center[1],
            lon: feature.center[0],
          },
        }))
        .filter((r: any) => this.isInRosarioArea(r.coordinates.lat, r.coordinates.lon));

      if (validResults.length === 0) {
        const result: GeocodeResult = {
          success: false,
          error: 'Las direcciones encontradas están fuera del área de Rosario. Intentá con una dirección dentro de la ciudad.',
        };
        this.setCachedResult(address, result);
        return result;
      }

      const bestMatch = validResults[0];
      const result: GeocodeResult = {
        success: true,
        address: bestMatch.displayName,
        coordinates: bestMatch.coordinates,
        suggestions: validResults.slice(0, 3),
      };

      this.setCachedResult(address, result);
      return result;
    } catch (error) {
      console.error('Mapbox geocoding error:', error);
      return {
        success: false,
        error: 'Error al buscar la dirección. Verificá tu conexión e intentá nuevamente.',
      };
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
    if (!this.isInRosarioArea(lat, lon)) {
      return {
        success: false,
        error: 'La ubicación está fuera del área de servicio de Rosario',
      };
    }

    const cacheKey = `reverse_${lat}_${lon}`;
    const cached = this.getCachedResult<ReverseGeocodeResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.config.baseUrl}/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${this.accessToken}&language=es`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        const result: ReverseGeocodeResult = {
          success: false,
          error: 'No se encontró una dirección para esta ubicación',
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      const feature = data.features[0];
      const result: ReverseGeocodeResult = {
        success: true,
        address: feature.place_name,
        formattedAddress: feature.place_name,
        coordinates: {
          lat: feature.center[1],
          lon: feature.center[0],
        },
      };

      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Mapbox reverse geocoding error:', error);
      return {
        success: false,
        error: 'Error al obtener la dirección. Verificá tu conexión e intentá nuevamente.',
      };
    }
  }

  async searchSuggestions(
    query: string,
    options?: {
      limit?: number;
      bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
    }
  ): Promise<Suggestion[]> {
    if (!query || query.trim().length < 3) {
      return [];
    }

    const result = await this.geocode(query);
    return result.suggestions || [];
  }

  async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    options?: { alternatives?: boolean; steps?: boolean }
  ): Promise<RouteResult> {
    const cacheKey = `route_${origin.lat}_${origin.lon}_${destination.lat}_${destination.lon}`;
    const cached = this.getCachedResult<RouteResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const coordinates = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
      const stepsParam = options?.steps ? 'true' : 'false';
      const alternativesParam = options?.alternatives ? 'true' : 'false';

      const url = `${this.config.baseUrl}/directions/v5/mapbox/driving/${coordinates}?access_token=${this.accessToken}&geometries=geojson&steps=${stepsParam}&alternatives=${alternativesParam}&language=es`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        throw new Error(`Mapbox Directions API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        return {
          success: false,
          error: 'No se pudo calcular la ruta entre los puntos seleccionados',
        };
      }

      const route = data.routes[0];
      const distanceKm = route.distance / 1000;
      const durationMin = Math.ceil(route.duration / 60);

      const steps = options?.steps
        ? route.legs[0]?.steps?.map((step: any) => ({
            instruction: step.maneuver?.instruction || '',
            distance: step.distance / 1000,
            duration: Math.ceil(step.duration / 60),
          }))
        : undefined;

      const result: RouteResult = {
        success: true,
        route: {
          distance: Math.round(distanceKm * 10) / 10,
          duration: durationMin,
          geometry: route.geometry,
          steps,
        },
      };

      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Mapbox route calculation error:', error);
      return {
        success: false,
        error: 'Error al calcular la ruta. Verificá tu conexión e intentá nuevamente.',
      };
    }
  }

  getStaticMapUrl(options: StaticMapOptions): string {
    const { center, zoom = 14, width = 600, height = 400, markers = [], path = [] } = options;

    let overlays: string[] = [];

    markers.forEach((marker) => {
      const color = marker.color || 'red';
      const label = marker.label || '';
      overlays.push(`pin-s-${label}+${color}(${marker.coordinates.lon},${marker.coordinates.lat})`);
    });

    if (path.length > 0) {
      const pathCoords = path.map((c) => `${c.lon},${c.lat}`).join(',');
      overlays.push(`path-5+0080ff-0.5(${pathCoords})`);
    }

    const overlayString = overlays.length > 0 ? overlays.join(',') + '/' : '';

    return `${this.config.baseUrl}/styles/v1/mapbox/streets-v12/static/${overlayString}${center.lon},${center.lat},${zoom}/${width}x${height}?access_token=${this.accessToken}`;
  }
}
