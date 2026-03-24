export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Suggestion {
  id: string;
  displayName: string;
  address?: string;
  coordinates: Coordinates;
}

export interface GeocodeResult {
  success: boolean;
  address?: string;
  coordinates?: Coordinates;
  suggestions?: Suggestion[];
  error?: string;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

export interface Route {
  distance: number;
  duration: number;
  geometry?: GeoJSON.LineString;
  steps?: RouteStep[];
}

export interface RouteResult {
  success: boolean;
  route?: Route;
  error?: string;
}

export interface StaticMapOptions {
  center: Coordinates;
  zoom?: number;
  width?: number;
  height?: number;
  markers?: Array<{
    coordinates: Coordinates;
    label?: string;
    color?: string;
  }>;
  path?: Coordinates[];
}

export interface ReverseGeocodeResult {
  success: boolean;
  address?: string;
  formattedAddress?: string;
  coordinates?: Coordinates;
  error?: string;
}

export interface MapProvider {
  name: string;

  geocode(address: string): Promise<GeocodeResult>;

  reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult>;

  searchSuggestions(query: string, options?: {
    limit?: number;
    bounds?: {
      minLat: number;
      maxLat: number;
      minLon: number;
      maxLon: number;
    };
  }): Promise<Suggestion[]>;

  calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    options?: {
      alternatives?: boolean;
      steps?: boolean;
    }
  ): Promise<RouteResult>;

  getStaticMapUrl(options: StaticMapOptions): string;
}

export interface MapProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}
