import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Coordinates } from '../lib/maps';

interface Marker {
  coordinates: Coordinates;
  label?: string;
  color?: 'green' | 'red' | 'blue' | 'orange';
}

interface StaticMapLeafletProps {
  center: { lat: number; lon: number };
  zoom?: number;
  markers?: Marker[];
  path?: Coordinates[];
  className?: string;
  height?: string;
}

export function StaticMapLeaflet({
  center,
  zoom = 13,
  markers = [],
  path = [],
  className = '',
  height = '300px',
}: StaticMapLeafletProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadLeaflet();
  }, []);

  useEffect(() => {
    if (isLoaded && mapInstanceRef.current) {
      updateMapContent();
    }
  }, [markers, path, center, isLoaded]);

  const loadLeaflet = async () => {
    try {
      const L = await import('leaflet');

      if (mapRef.current && !mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current, {
          scrollWheelZoom: false,
          dragging: true,
          zoomControl: true,
        }).setView([center.lat, center.lon], zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);

        setIsLoaded(true);
      }
    } catch (error) {
      console.error('Error loading Leaflet:', error);
    }
  };

  const updateMapContent = async () => {
    if (!mapInstanceRef.current) return;

    const L = await import('leaflet');

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    markers.forEach((markerData) => {
      const colorMap = {
        green: '#22c55e',
        red: '#ef4444',
        blue: '#3b82f6',
        orange: '#f97316',
      };

      const icon = L.divIcon({
        className: 'custom-static-marker',
        html: `
          <div class="relative">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white" style="background-color: ${
              colorMap[markerData.color || 'blue']
            }">
              <span class="text-white font-bold text-lg">${markerData.label || '•'}</span>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([markerData.coordinates.lat, markerData.coordinates.lon], { icon })
        .addTo(mapInstanceRef.current);

      markersRef.current.push(marker);
    });

    if (path.length > 1) {
      const pathCoords = path.map((coord) => [coord.lat, coord.lon] as [number, number]);
      polylineRef.current = L.polyline(pathCoords, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.7,
      }).addTo(mapInstanceRef.current);
    }

    if (markers.length > 0 || path.length > 0) {
      const allPoints = [
        ...markers.map((m) => [m.coordinates.lat, m.coordinates.lon] as [number, number]),
        ...path.map((p) => [p.lat, p.lon] as [number, number]),
      ];

      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } else {
      mapInstanceRef.current.setView([center.lat, center.lon], zoom);
    }
  };

  return (
    <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      <div ref={mapRef} className="w-full" style={{ height }} />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Cargando mapa...</p>
          </div>
        </div>
      )}
    </div>
  );
}
