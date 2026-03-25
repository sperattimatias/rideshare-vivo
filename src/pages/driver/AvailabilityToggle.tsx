import { useState, useEffect } from 'react';
import { Power, MapPin, Navigation, AlertCircle } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { toDbGeographyPoint } from '../../lib/geospatial';

type DriverRow = Database['public']['Tables']['drivers']['Row'];

interface AvailabilityToggleProps {
  driver: DriverRow;
  onUpdate: () => void;
}

export function AvailabilityToggle({ driver, onUpdate }: AvailabilityToggleProps) {
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (driver.is_online) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [driver.is_online]);

  const startLocationTracking = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const stopLocationTracking = () => {
    setLocation(null);
  };

  const handleToggleOnline = async () => {
    setUpdating(true);

    try {
      const newOnlineStatus = !driver.is_online;

      if (newOnlineStatus && !location) {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const locationPoint = toDbGeographyPoint({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
              });

              await supabase
                .from('drivers')
                .update({
                  is_online: true,
                  current_location: locationPoint,
                  last_location_update: new Date().toISOString(),
                })
                .eq('id', driver.id);

              setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });

              onUpdate();
            },
            (error) => {
              console.error('Error getting location:', error);
              alert('No se pudo obtener tu ubicación. Por favor, habilitá los permisos de ubicación.');
            }
          );
        } else {
          alert('Tu navegador no soporta geolocalización');
        }
      } else {
        await supabase
          .from('drivers')
          .update({
            is_online: newOnlineStatus,
            current_location: newOnlineStatus ? driver.current_location : null,
          })
          .eq('id', driver.id);

        onUpdate();
      }
    } catch (error) {
      console.error('Error toggling online status:', error);
      alert('Error al cambiar el estado');
    } finally {
      setUpdating(false);
    }
  };

  if (!driver.can_receive_trips) {
    return (
      <Card className="bg-yellow-50 border-2 border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 mb-2">No podés recibir viajes todavía</h3>
            <p className="text-yellow-800 text-sm mb-3">
              Completá todos los requisitos para activar tu cuenta:
            </p>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              {!driver.documents_validated && <li>Validación de documentos pendiente</li>}
              {driver.mp_status !== 'LINKED' && <li>Vinculación de Mercado Pago pendiente</li>}
              {driver.score < 60 && <li>Score mínimo de 60 requerido</li>}
            </ul>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Estado de Disponibilidad</h2>
          <p className="text-sm text-gray-600">
            {driver.is_online
              ? 'Estás en línea y podés recibir solicitudes'
              : 'Estás fuera de línea'}
          </p>
        </div>

        <button
          onClick={handleToggleOnline}
          disabled={updating || driver.is_on_trip}
          className={`relative inline-flex h-14 w-28 items-center rounded-full transition-colors ${
            driver.is_online
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-300 hover:bg-gray-400'
          } ${(updating || driver.is_on_trip) && 'opacity-50 cursor-not-allowed'}`}
        >
          <span
            className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform ${
              driver.is_online ? 'translate-x-16' : 'translate-x-2'
            }`}
          >
            <Power
              className={`w-6 h-6 m-2 ${driver.is_online ? 'text-green-600' : 'text-gray-400'}`}
            />
          </span>
        </button>
      </div>

      <div className="space-y-3">
        <div
          className={`p-4 rounded-lg transition-colors ${
            driver.is_online ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-3 h-3 rounded-full ${driver.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
            />
            <span
              className={`font-semibold ${driver.is_online ? 'text-green-900' : 'text-gray-700'}`}
            >
              {driver.is_online ? 'En línea' : 'Fuera de línea'}
            </span>
          </div>

          {driver.is_online && (
            <div className="text-sm text-green-800 space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>
                  {location
                    ? `Ubicación: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                    : 'Obteniendo ubicación...'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                <span>Buscando viajes cercanos...</span>
              </div>
            </div>
          )}

          {!driver.is_online && (
            <p className="text-sm text-gray-600">
              Activá tu disponibilidad para comenzar a recibir solicitudes de viaje
            </p>
          )}
        </div>

        {driver.is_on_trip && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Viaje en curso</p>
                <p className="text-sm text-blue-800 mt-1">
                  Completá tu viaje actual antes de cambiar tu estado de disponibilidad
                </p>
              </div>
            </div>
          </div>
        )}

        {driver.is_online && !driver.is_on_trip && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 text-sm">Mientras estás en línea:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Recibirás notificaciones de viajes cercanos</li>
              <li>Tu ubicación se actualiza automáticamente</li>
              <li>Podés aceptar o rechazar solicitudes</li>
              <li>Permanecé atento a las notificaciones</li>
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
