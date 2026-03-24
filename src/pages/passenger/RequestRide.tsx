import { useState, FormEvent } from 'react';
import { MapPin, Calendar, Clock, DollarSign, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateDistanceKm, calculateEstimatedDurationMinutes, formatDistance, formatDuration } from '../../lib/geo';
import { calculateFare } from '../../lib/pricing';

interface RequestRideProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function RequestRide({ onBack, onSuccess }: RequestRideProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);

  const [originAddress, setOriginAddress] = useState('');
  const [originLat, setOriginLat] = useState('');
  const [originLon, setOriginLon] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationLat, setDestinationLat] = useState('');
  const [destinationLon, setDestinationLon] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [notes, setNotes] = useState('');

  const calculateEstimate = () => {
    try {
      const lat1 = parseFloat(originLat);
      const lon1 = parseFloat(originLon);
      const lat2 = parseFloat(destinationLat);
      const lon2 = parseFloat(destinationLon);

      if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
        setError('Por favor ingresá coordenadas válidas para origen y destino');
        return;
      }

      const distance = calculateDistanceKm(lat1, lon1, lat2, lon2);
      const duration = calculateEstimatedDurationMinutes(distance);
      const fare = calculateFare(distance);

      setEstimatedDistance(distance);
      setEstimatedDuration(duration);
      setEstimatedFare(fare);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: passenger } = await supabase
        .from('passengers')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!passenger) {
        throw new Error('Perfil de pasajero no encontrado');
      }

      const lat1 = parseFloat(originLat);
      const lon1 = parseFloat(originLon);
      const lat2 = parseFloat(destinationLat);
      const lon2 = parseFloat(destinationLon);

      const tripData = {
        passenger_id: passenger.id,
        origin_address: originAddress,
        origin_latitude: lat1,
        origin_longitude: lon1,
        destination_address: destinationAddress,
        destination_latitude: lat2,
        destination_longitude: lon2,
        status: 'REQUESTED' as const,
        estimated_fare: estimatedFare,
        estimated_distance_km: estimatedDistance,
        estimated_duration_minutes: estimatedDuration,
        scheduled_for: scheduledFor || undefined,
      };

      const { error: insertError } = await supabase
        .from('trips')
        .insert([tripData]);

      if (insertError) throw insertError;

      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Solicitar Viaje</h1>
          <p className="text-gray-600">Ingresá los detalles de tu viaje</p>
        </div>

        <Card>
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Geocodificación en desarrollo</p>
                <p className="text-sm text-yellow-800 mt-1">
                  Por ahora, ingresá manualmente las direcciones y coordenadas. La búsqueda automática se implementará próximamente.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 text-green-600" />
                Origen
              </label>
              <Input
                type="text"
                value={originAddress}
                onChange={(e) => setOriginAddress(e.target.value)}
                placeholder="Ej: Av. Corrientes 1234, CABA"
                required
                fullWidth
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input
                  type="number"
                  step="any"
                  value={originLat}
                  onChange={(e) => setOriginLat(e.target.value)}
                  placeholder="Latitud (ej: -34.6037)"
                  required
                  fullWidth
                />
                <Input
                  type="number"
                  step="any"
                  value={originLon}
                  onChange={(e) => setOriginLon(e.target.value)}
                  placeholder="Longitud (ej: -58.3816)"
                  required
                  fullWidth
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 text-red-600" />
                Destino
              </label>
              <Input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="Ej: Av. Santa Fe 5678, CABA"
                required
                fullWidth
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input
                  type="number"
                  step="any"
                  value={destinationLat}
                  onChange={(e) => setDestinationLat(e.target.value)}
                  placeholder="Latitud (ej: -34.6137)"
                  required
                  fullWidth
                />
                <Input
                  type="number"
                  step="any"
                  value={destinationLon}
                  onChange={(e) => setDestinationLon(e.target.value)}
                  placeholder="Longitud (ej: -58.3716)"
                  required
                  fullWidth
                />
              </div>
            </div>

            {originAddress && destinationAddress && originLat && originLon && destinationLat && destinationLon && !estimatedFare && (
              <Button
                type="button"
                variant="outline"
                onClick={calculateEstimate}
                fullWidth
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Calcular tarifa estimada
              </Button>
            )}

            {estimatedFare && estimatedDistance && estimatedDuration && (
              <Card className="bg-blue-50 border-2 border-blue-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800 mb-1">Tarifa estimada</p>
                      <p className="text-3xl font-bold text-blue-900">${estimatedFare}</p>
                    </div>
                    <DollarSign className="w-12 h-12 text-blue-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-blue-300">
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Distancia</p>
                      <p className="text-sm font-semibold text-blue-900">{formatDistance(estimatedDistance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Duración estimada</p>
                      <p className="text-sm font-semibold text-blue-900">{formatDuration(estimatedDuration)}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Opciones adicionales</h3>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    Programar viaje (opcional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    fullWidth
                    helperText="Dejá vacío para solicitar un viaje inmediato"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    Notas para el conductor (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Voy con equipaje, necesito ayuda con silla de ruedas, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-gray-900 text-sm">Método de pago</h4>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <img
                  src="https://images.pexels.com/photos/50987/money-card-business-credit-card-50987.jpeg?auto=compress&cs=tinysrgb&w=100"
                  alt="Mercado Pago"
                  className="w-12 h-8 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Mercado Pago</p>
                  <p className="text-xs text-gray-600">Pago automático al finalizar</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                fullWidth
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !estimatedFare}
                fullWidth
              >
                {loading ? 'Solicitando...' : scheduledFor ? 'Programar viaje' : 'Solicitar viaje'}
              </Button>
            </div>
          </form>
        </Card>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Cómo funciona</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Solicitás el viaje con origen y destino</li>
            <li>El sistema busca conductores disponibles cercanos</li>
            <li>Un conductor acepta tu solicitud</li>
            <li>El conductor llega a tu ubicación</li>
            <li>Realizás el viaje</li>
            <li>El pago se procesa automáticamente</li>
            <li>Calificás al conductor</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
