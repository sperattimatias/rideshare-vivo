import { useEffect, useRef, useState } from 'react';
import { Car, User, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import 'leaflet/dist/leaflet.css';

interface Driver {
  id: string;
  full_name: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_color: string;
  vehicle_plate: string;
  latitude: number;
  longitude: number;
  is_on_trip: boolean;
  status: string;
}

interface WaitingTrip {
  id: string;
  passenger_name: string;
  origin_address: string;
  origin_latitude: number;
  origin_longitude: number;
  requested_at: string;
}

interface LeafletMapProps {
  className?: string;
  center?: { lat: number; lon: number };
  zoom?: number;
}

export function LeafletMap({ className = '', center, zoom = 13 }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [waitingTrips, setWaitingTrips] = useState<WaitingTrip[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadLeaflet();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      loadMapData();
      const interval = setInterval(loadMapData, 5000);

      const driversSubscription = supabase
        .channel('drivers-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'drivers',
          },
          () => {
            loadMapData();
          }
        )
        .subscribe();

      const tripsSubscription = supabase
        .channel('trips-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trips',
          },
          () => {
            loadMapData();
          }
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        driversSubscription.unsubscribe();
        tripsSubscription.unsubscribe();
      };
    }
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded && mapInstanceRef.current) {
      updateMarkers();
    }
  }, [drivers, waitingTrips, isLoaded]);

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

        setIsLoaded(true);
      }
    } catch (error) {
      console.error('Error loading Leaflet:', error);
    }
  };

  const loadMapData = async () => {
    try {
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select(`
          id,
          is_on_trip,
          status,
          vehicle_brand,
          vehicle_model,
          vehicle_color,
          vehicle_plate,
          current_location,
          user_profiles!drivers_user_id_fkey (
            full_name
          )
        `)
        .eq('is_online', true)
        .not('current_location', 'is', null);

      if (driversError) throw driversError;

      const mappedDrivers = (driversData || [])
        .map((d: any) => {
          if (!d.current_location) return null;

          const coords = parsePostGISPoint(d.current_location);
          if (!coords) return null;

          return {
            id: d.id,
            full_name: d.user_profiles?.full_name || 'Conductor',
            vehicle_brand: d.vehicle_brand,
            vehicle_model: d.vehicle_model,
            vehicle_color: d.vehicle_color,
            vehicle_plate: d.vehicle_plate,
            latitude: coords.lat,
            longitude: coords.lon,
            is_on_trip: d.is_on_trip,
            status: d.status,
          };
        })
        .filter((d): d is Driver => d !== null);

      setDrivers(mappedDrivers);

      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select(`
          id,
          origin_address,
          origin_latitude,
          origin_longitude,
          requested_at,
          passengers!trips_passenger_id_fkey (
            user_profiles!passengers_user_id_fkey (
              full_name
            )
          )
        `)
        .in('status', ['REQUESTED', 'ACCEPTED'])
        .not('origin_latitude', 'is', null)
        .not('origin_longitude', 'is', null)
        .order('requested_at', { ascending: false });

      if (tripsError) throw tripsError;

      const mappedTrips = (tripsData || []).map((t: any) => ({
        id: t.id,
        passenger_name: t.passengers?.user_profiles?.full_name || 'Pasajero',
        origin_address: t.origin_address,
        origin_latitude: Number(t.origin_latitude),
        origin_longitude: Number(t.origin_longitude),
        requested_at: t.requested_at,
      }));

      setWaitingTrips(mappedTrips);

      if (mappedDrivers.length > 0 || mappedTrips.length > 0) {
        const allPoints = [
          ...mappedDrivers.map((d) => ({ lat: d.latitude, lon: d.longitude })),
          ...mappedTrips.map((t) => ({ lat: t.origin_latitude, lon: t.origin_longitude })),
        ];

        const avgLat = allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length;
        const avgLon = allPoints.reduce((sum, p) => sum + p.lon, 0) / allPoints.length;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([avgLat, avgLon], zoom);
        }
      }
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  };

  const parsePostGISPoint = (point: string): { lat: number; lon: number } | null => {
    try {
      const match = point.match(/POINT\(([^ ]+) ([^ ]+)\)/);
      if (!match) return null;
      return {
        lon: parseFloat(match[1]),
        lat: parseFloat(match[2]),
      };
    } catch {
      return null;
    }
  };

  const updateMarkers = async () => {
    if (!mapInstanceRef.current) return;

    const L = await import('leaflet');

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    drivers.forEach((driver) => {
      const icon = L.divIcon({
        className: 'custom-driver-marker',
        html: `
          <div class="relative">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
              driver.is_on_trip ? 'bg-green-500 ring-4 ring-green-200' : 'bg-blue-500 ring-4 ring-blue-200'
            }">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/>
                <circle cx="6.5" cy="16.5" r="2.5"/>
                <circle cx="16.5" cy="16.5" r="2.5"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([driver.latitude, driver.longitude], { icon })
        .bindPopup(`
          <div class="p-2">
            <p class="font-semibold text-gray-900">${driver.full_name}</p>
            <p class="text-sm text-gray-600">${driver.vehicle_brand} ${driver.vehicle_model}</p>
            <p class="text-sm text-gray-500">${driver.vehicle_plate}</p>
            <div class="mt-2 pt-2 border-t border-gray-200">
              <span class="text-sm font-medium ${driver.is_on_trip ? 'text-green-600' : 'text-blue-600'}">
                ${driver.is_on_trip ? 'En viaje' : 'Disponible'}
              </span>
            </div>
          </div>
        `)
        .addTo(mapInstanceRef.current);

      markersRef.current.set(`driver-${driver.id}`, marker);
    });

    waitingTrips.forEach((trip) => {
      const minutesWaiting = Math.round(
        (new Date().getTime() - new Date(trip.requested_at).getTime()) / 60000
      );

      const icon = L.divIcon({
        className: 'custom-trip-marker',
        html: `
          <div class="relative">
            <div class="w-8 h-8 rounded-full bg-orange-500 ring-4 ring-orange-200 flex items-center justify-center shadow-lg animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            ${
              minutesWaiting > 2
                ? '<div class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">!</div>'
                : ''
            }
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([trip.origin_latitude, trip.origin_longitude], { icon })
        .bindPopup(`
          <div class="p-2">
            <p class="font-semibold text-gray-900">${trip.passenger_name}</p>
            <p class="text-sm text-gray-600">${trip.origin_address}</p>
            <div class="mt-2 pt-2 border-t border-gray-200">
              <span class="text-sm text-orange-600 font-medium">
                Esperando ${minutesWaiting} min
              </span>
            </div>
          </div>
        `)
        .addTo(mapInstanceRef.current);

      markersRef.current.set(`trip-${trip.id}`, marker);
    });
  };

  return (
    <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      <div ref={mapRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-gray-700">Mapa en Vivo - OpenStreetMap</span>
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Car className="w-3 h-3 text-blue-600" />
            <span>{drivers.length} conductores</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-orange-600" />
            <span>{waitingTrips.length} esperando</span>
          </div>
        </div>
      </div>

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
