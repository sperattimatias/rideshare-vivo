import { useState, useEffect } from 'react';
import { getStaticMapUrl } from '../lib/maps';
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
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMapUrl() {
      try {
        const url = await getStaticMapUrl({
          center,
          zoom,
          width,
          height,
          markers,
          path,
        });
        setMapUrl(url);
      } catch (error) {
        console.error('Error loading map URL:', error);
        setMapUrl(null);
      } finally {
        setLoading(false);
      }
    }

    loadMapUrl();
  }, [center.lat, center.lon, zoom, width, height, markers, path]);

  if (loading) {
    return (
      <div
        className={`bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center ${className}`}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <p className="text-gray-600 text-sm">Cargando mapa...</p>
      </div>
    );
  }

  if (!mapUrl) {
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
            Configurá Mapbox o Google Maps en Configuración del Sistema
          </p>
        </div>
      </div>
    );
  }

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
