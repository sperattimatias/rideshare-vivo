import { mapProvider } from '../lib/maps';
import type { Coordinates } from '../lib/maps';

interface StaticMapProps {
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
  className?: string;
  alt?: string;
}

export function StaticMap({
  center,
  zoom = 14,
  width = 600,
  height = 400,
  markers = [],
  path = [],
  className = '',
  alt = 'Mapa',
}: StaticMapProps) {
  if (mapProvider.name === 'nominatim') {
    return (
      <div
        className={`bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center ${className}`}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <div className="text-center px-4">
          <p className="text-gray-600 text-sm">
            Vista previa de mapa no disponible con el proveedor actual
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Configurá VITE_MAPBOX_TOKEN para habilitar mapas visuales
          </p>
        </div>
      </div>
    );
  }

  const mapUrl = mapProvider.getStaticMapUrl({
    center,
    zoom,
    width,
    height,
    markers,
    path,
  });

  return (
    <img
      src={mapUrl}
      alt={alt}
      width={width}
      height={height}
      className={`rounded-lg shadow-md ${className}`}
      loading="lazy"
    />
  );
}
