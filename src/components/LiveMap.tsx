import { useEffect, useState, useRef } from 'react';
import { Car, User, MapPin, Navigation } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

interface LiveMapProps {
  className?: string;
}

export function LiveMap({ className = '' }: LiveMapProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [waitingTrips, setWaitingTrips] = useState<WaitingTrip[]>([]);
  const [center, setCenter] = useState({ lat: -34.6037, lon: -58.3816 });
  const [zoom, setZoom] = useState(12);
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedTrip, setWaitingTrip] = useState<WaitingTrip | null>(null);

  useEffect(() => {
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
  }, []);

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

        setCenter({ lat: avgLat, lon: avgLon });
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

  const getPixelPosition = (lat: number, lon: number) => {
    const mapWidth = mapRef.current?.offsetWidth || 800;
    const mapHeight = mapRef.current?.offsetHeight || 600;

    const latRange = 0.05;
    const lonRange = 0.08;

    const x = ((lon - (center.lon - lonRange / 2)) / lonRange) * mapWidth;
    const y = ((center.lat + latRange / 2 - lat) / latRange) * mapHeight;

    return { x, y };
  };

  return (
    <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      <div
        ref={mapRef}
        className="w-full h-full relative"
        style={{
          backgroundImage: `
            linear-gradient(rgba(229, 231, 235, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(229, 231, 235, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          backgroundColor: '#f3f4f6',
        }}
      >
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-gray-700">Mapa en Vivo</span>
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

        {drivers.map((driver) => {
          const pos = getPixelPosition(driver.latitude, driver.longitude);
          return (
            <div
              key={driver.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
              onClick={() => setSelectedDriver(driver)}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  driver.is_on_trip
                    ? 'bg-green-500 ring-4 ring-green-200'
                    : 'bg-blue-500 ring-4 ring-blue-200'
                } group-hover:scale-110`}
              >
                <Car className="w-5 h-5 text-white" />
              </div>
              <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 min-w-32 hidden group-hover:block">
                <p className="text-xs font-semibold text-gray-900">{driver.full_name}</p>
                <p className="text-xs text-gray-600">
                  {driver.vehicle_brand} {driver.vehicle_model}
                </p>
                <p className="text-xs text-gray-500">{driver.vehicle_plate}</p>
                <div className="mt-1 pt-1 border-t border-gray-200">
                  <span
                    className={`text-xs font-medium ${
                      driver.is_on_trip ? 'text-green-600' : 'text-blue-600'
                    }`}
                  >
                    {driver.is_on_trip ? 'En viaje' : 'Disponible'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {waitingTrips.map((trip) => {
          const pos = getPixelPosition(trip.origin_latitude, trip.origin_longitude);
          const minutesWaiting = Math.round(
            (new Date().getTime() - new Date(trip.requested_at).getTime()) / 60000
          );

          return (
            <div
              key={trip.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
              onClick={() => setWaitingTrip(trip)}
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-orange-500 ring-4 ring-orange-200 flex items-center justify-center shadow-lg animate-pulse">
                  <User className="w-4 h-4 text-white" />
                </div>
                {minutesWaiting > 2 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    !
                  </div>
                )}
              </div>
              <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 min-w-36 hidden group-hover:block z-20">
                <p className="text-xs font-semibold text-gray-900">{trip.passenger_name}</p>
                <p className="text-xs text-gray-600 truncate">{trip.origin_address}</p>
                <div className="mt-1 pt-1 border-t border-gray-200">
                  <span className="text-xs text-orange-600 font-medium">
                    Esperando {minutesWaiting} min
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          <button
            onClick={() => setZoom(Math.min(zoom + 1, 18))}
            className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            +
          </button>
          <button
            onClick={() => setZoom(Math.max(zoom - 1, 8))}
            className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            -
          </button>
        </div>

        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2">
          <Navigation className="w-4 h-4 text-gray-600" />
        </div>
      </div>

      {drivers.length === 0 && waitingTrips.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No hay datos para mostrar</p>
            <p className="text-xs text-gray-500">Los conductores y viajes aparecerán aquí</p>
          </div>
        </div>
      )}
    </div>
  );
}
