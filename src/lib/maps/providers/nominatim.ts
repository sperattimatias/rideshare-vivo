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

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

const ROSARIO_BOUNDS = {
  minLat: -33.1,
  maxLat: -32.8,
  minLon: -60.9,
  maxLon: -60.5,
};

const CACHE_DURATION_MS = 1000 * 60 * 60;
const geocodeCache = new Map<string, { result: any; timestamp: number }>();

interface NominatimAddress {
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
  place_id?: number;
}

export class NominatimProvider implements MapProvider {
  name = 'nominatim';
  private config: MapProviderConfig;

  constructor(config: MapProviderConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || NOMINATIM_BASE_URL,
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

  private async searchNominatim(query: string, limit: number = 5): Promise<NominatimAddress[]> {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: limit.toString(),
      countrycodes: 'ar',
      bounded: '1',
      viewbox: `${ROSARIO_BOUNDS.minLon},${ROSARIO_BOUNDS.minLat},${ROSARIO_BOUNDS.maxLon},${ROSARIO_BOUNDS.maxLat}`,
    });

    const response = await fetch(`${this.config.baseUrl}/search?${params}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'VIVO-Platform-Rosario/1.0',
      },
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      throw new Error(`Error de geocodificación: ${response.statusText}`);
    }

    return response.json();
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
      const cleanQuery = `${address.trim()}, Rosario, Santa Fe, Argentina`;
      let results = await this.searchNominatim(cleanQuery);

      if (!results || results.length === 0) {
        const fallbackQuery = `${address.trim()}, Rosario, Argentina`;
        results = await this.searchNominatim(fallbackQuery);

        if (!results || results.length === 0) {
          const result: GeocodeResult = {
            success: false,
            error: 'No se encontraron resultados. Intentá con otra dirección o lugar conocido de Rosario.',
          };
          this.setCachedResult(address, result);
          return result;
        }
      }

      const validResults = results
        .map((r) => ({
          display_name: r.display_name,
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          place_id: r.place_id,
        }))
        .filter((r) => !isNaN(r.lat) && !isNaN(r.lon) && this.isInRosarioArea(r.lat, r.lon));

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
        address: bestMatch.display_name,
        coordinates: {
          lat: bestMatch.lat,
          lon: bestMatch.lon,
        },
        suggestions: validResults.slice(0, 3).map((r, idx) => ({
          id: `${r.place_id || idx}`,
          displayName: r.display_name,
          address: r.display_name,
          coordinates: { lat: r.lat, lon: r.lon },
        })),
      };

      this.setCachedResult(address, result);
      return result;
    } catch (error) {
      console.error('Geocoding error:', error);
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
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'json',
        addressdetails: '1',
      });

      const response = await fetch(`${this.config.baseUrl}/reverse?${params}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'VIVO-Platform-Rosario/1.0',
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        throw new Error(`Error de geocodificación inversa: ${response.statusText}`);
      }

      const data: NominatimAddress = await response.json();

      if (!data || !data.display_name) {
        const result: ReverseGeocodeResult = {
          success: false,
          error: 'No se encontró una dirección para esta ubicación',
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      const result: ReverseGeocodeResult = {
        success: true,
        address: data.display_name,
        formattedAddress: data.display_name,
        coordinates: {
          lat: parseFloat(data.lat),
          lon: parseFloat(data.lon),
        },
      };

      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
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
    void options;
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
    void options;
    const distance = this.calculateDistanceKm(origin.lat, origin.lon, destination.lat, destination.lon);
    const duration = this.calculateEstimatedDurationMinutes(distance);

    return {
      success: true,
      route: {
        distance,
        duration,
        geometry: {
          type: 'LineString',
          coordinates: [
            [origin.lon, origin.lat],
            [destination.lon, destination.lat],
          ],
        },
      },
    };
  }

  getStaticMapUrl(options: StaticMapOptions): string {
    void options;
    return '';
  }

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10;
  }

  private calculateEstimatedDurationMinutes(distanceKm: number, averageSpeedKmH: number = 30): number {
    if (distanceKm < 0 || averageSpeedKmH <= 0) {
      return 0;
    }

    const hours = distanceKm / averageSpeedKmH;
    const minutes = hours * 60;
    const baseMinutes = Math.ceil(minutes);
    const extraMinutes = 2;

    return baseMinutes + extraMinutes;
  }
}
