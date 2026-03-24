import { useEffect, useRef, useState } from 'react';
import { MapPin, Trash2, AlertCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Point {
  lat: number;
  lon: number;
}

interface ZoneDrawingMapProps {
  className?: string;
  center?: { lat: number; lon: number };
  zoom?: number;
  initialPoints?: Point[];
  onPointsChange?: (points: Point[]) => void;
  existingZones?: Array<{
    id: string;
    name: string;
    boundary_points: Point[];
  }>;
}

export function ZoneDrawingMap({
  className = '',
  center,
  zoom = 13,
  initialPoints = [],
  onPointsChange,
  existingZones = [],
}: ZoneDrawingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [points, setPoints] = useState<Point[]>(initialPoints);
  const markersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);
  const existingPolygonsRef = useRef<any[]>([]);

  useEffect(() => {
    loadLeaflet();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      updatePolygon();
    }
  }, [points, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      updateExistingZones();
    }
  }, [existingZones, isLoaded]);

  const loadLeaflet = async () => {
    try {
      const L = await import('leaflet');

      if (mapRef.current && !mapInstanceRef.current) {
        const defaultCenter = center || { lat: -32.9468, lon: -60.6393 };

        mapInstanceRef.current = L.map(mapRef.current).setView(
          [defaultCenter.lat, defaultCenter.lon],
          zoom
        );

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);

        mapInstanceRef.current.on('click', handleMapClick);

        setIsLoaded(true);
      }
    } catch (error) {
      console.error('Error loading Leaflet:', error);
    }
  };

  const handleMapClick = async (e: any) => {
    const newPoint = {
      lat: e.latlng.lat,
      lon: e.latlng.lng,
    };

    const newPoints = [...points, newPoint];
    setPoints(newPoints);

    if (onPointsChange) {
      onPointsChange(newPoints);
    }
  };

  const removeLastPoint = () => {
    if (points.length > 0) {
      const newPoints = points.slice(0, -1);
      setPoints(newPoints);

      if (onPointsChange) {
        onPointsChange(newPoints);
      }
    }
  };

  const clearAllPoints = () => {
    setPoints([]);
    if (onPointsChange) {
      onPointsChange([]);
    }
  };

  const updatePolygon = async () => {
    if (!mapInstanceRef.current) return;

    const L = await import('leaflet');

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (polygonRef.current) {
      polygonRef.current.remove();
      polygonRef.current = null;
    }

    points.forEach((point, index) => {
      const icon = L.divIcon({
        className: 'custom-point-marker',
        html: `
          <div class="relative">
            <div class="w-8 h-8 rounded-full bg-purple-500 ring-4 ring-purple-200 flex items-center justify-center shadow-lg">
              <span class="text-white text-xs font-bold">${index + 1}</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([point.lat, point.lon], { icon })
        .bindPopup(`<div class="p-2">
          <p class="font-semibold text-gray-900">Punto ${index + 1}</p>
          <p class="text-xs text-gray-600">Lat: ${point.lat.toFixed(6)}</p>
          <p class="text-xs text-gray-600">Lon: ${point.lon.toFixed(6)}</p>
        </div>`)
        .addTo(mapInstanceRef.current);

      markersRef.current.push(marker);
    });

    if (points.length >= 3) {
      const latLngs = points.map((p) => [p.lat, p.lon] as [number, number]);

      polygonRef.current = L.polygon(latLngs, {
        color: '#8b5cf6',
        fillColor: '#8b5cf6',
        fillOpacity: 0.3,
        weight: 2,
      }).addTo(mapInstanceRef.current);

      const bounds = polygonRef.current.getBounds();
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const updateExistingZones = async () => {
    if (!mapInstanceRef.current) return;

    const L = await import('leaflet');

    existingPolygonsRef.current.forEach((polygon) => polygon.remove());
    existingPolygonsRef.current = [];

    existingZones.forEach((zone) => {
      if (zone.boundary_points && zone.boundary_points.length >= 3) {
        const latLngs = zone.boundary_points.map(
          (p) => [p.lat, p.lon] as [number, number]
        );

        const polygon = L.polygon(latLngs, {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 2,
          dashArray: '5, 5',
        })
          .bindPopup(`
            <div class="p-2">
              <p class="font-semibold text-gray-900">${zone.name}</p>
              <p class="text-xs text-gray-600">${zone.boundary_points.length} puntos</p>
            </div>
          `)
          .addTo(mapInstanceRef.current);

        existingPolygonsRef.current.push(polygon);
      }
    });
  };

  return (
    <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      <div ref={mapRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000] max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-medium text-gray-700">Dibujar Zona</span>
        </div>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>Hacé clic en el mapa para agregar puntos. Se necesitan al menos 3 puntos.</span>
          </div>
          <div className="pt-2 border-t border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Puntos: {points.length}</span>
              {points.length >= 3 && (
                <span className="text-green-600 font-medium">✓ Zona válida</span>
              )}
            </div>
            {points.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={removeLastPoint}
                  className="flex-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                >
                  Quitar último
                </button>
                <button
                  onClick={clearAllPoints}
                  className="flex-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpiar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {existingZones.length > 0 && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 z-[1000] text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-500 border-dashed bg-blue-100" />
            <span>Zonas existentes</span>
          </div>
        </div>
      )}

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-gray-600">Cargando mapa...</p>
          </div>
        </div>
      )}
    </div>
  );
}
