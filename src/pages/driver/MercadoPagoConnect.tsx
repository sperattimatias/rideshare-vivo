import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface MercadoPagoConnectProps {
  onComplete: () => void;
}

export function MercadoPagoConnect({ onComplete }: MercadoPagoConnectProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mpStatus, setMpStatus] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    checkMercadoPagoStatus();

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'MP_OAUTH_SUCCESS') {
        checkMercadoPagoStatus();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkMercadoPagoStatus = async () => {
    try {
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('mp_oauth_status, mp_seller_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (driverError) throw driverError;

      setMpStatus(driver?.mp_oauth_status || 'PENDING');
    } catch (err) {
      console.error('Error checking MP status:', err);
      setMpStatus('PENDING');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleConnectMercadoPago = async () => {
    setLoading(true);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuración de Supabase no encontrada');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/mp-oauth-start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al iniciar conexión con Mercado Pago');
      }

      const data = await response.json();

      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      window.open(
        data.authUrl,
        'MercadoPagoAuth',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

    } catch (err) {
      console.error('Error connecting to Mercado Pago:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (mpStatus === 'AUTHORIZED') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold mb-4">Mercado Pago Conectado</h2>

        <Card className="bg-green-50 border-2 border-green-200">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Cuenta Conectada!</h3>
            <p className="text-gray-600 mb-6">
              Tu cuenta de Mercado Pago está vinculada correctamente.
            </p>
            <div className="bg-white rounded-lg p-4 text-left max-w-md mx-auto mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Próximos pasos:</h4>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>Revisión de documentos (24-48 horas)</li>
                <li>Aprobación final del equipo de VIVO</li>
                <li>¡Empezá a recibir viajes y ganancias!</li>
              </ol>
            </div>
            <Button variant="primary" onClick={onComplete}>
              Volver al Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Vincular Mercado Pago</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-3">
          <CreditCard className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">¿Por qué necesitás vincular Mercado Pago?</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Recibí tus ganancias automáticamente después de cada viaje</li>
              <li>Sin complicaciones de liquidaciones manuales</li>
              <li>La plataforma descuenta su comisión automáticamente (20%)</li>
              <li>Seguro y transparente con Mercado Pago</li>
              <li>El dinero se acredita en tu cuenta instantáneamente</li>
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error al conectar</p>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <Card className="bg-white">
        <div className="text-center py-8">
          <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-10 h-10 text-blue-600" />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-2">Conectar con Mercado Pago</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Hacé clic en el botón para autorizar a VIVO a procesar tus pagos de manera segura a través de Mercado Pago.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">¿Cómo funciona?</h4>
            <ol className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 flex-shrink-0">1.</span>
                <span>Se abrirá una ventana de Mercado Pago</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 flex-shrink-0">2.</span>
                <span>Iniciá sesión con tu cuenta de Mercado Pago</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 flex-shrink-0">3.</span>
                <span>Autorizá a VIVO para recibir pagos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 flex-shrink-0">4.</span>
                <span>¡Listo! Ya podés recibir ganancias</span>
              </li>
            </ol>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 text-left">
                <strong>Importante:</strong> Asegurate de tener una cuenta de Mercado Pago activa. Si no tenés una, podés crearla gratis en{' '}
                <a
                  href="https://www.mercadopago.com.ar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  mercadopago.com.ar
                </a>
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleConnectMercadoPago}
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <ExternalLink className="w-5 h-5 mr-2" />
                Conectar con Mercado Pago
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 mt-4">
            Al conectar tu cuenta, aceptás los términos de uso de Mercado Pago Marketplace
          </p>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onComplete}>
          Omitir por ahora
        </Button>
      </div>
    </div>
  );
}
