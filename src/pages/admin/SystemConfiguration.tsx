import { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, MapPin, Save, AlertCircle, CreditCard, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { AdminLoadingState, AdminEmptyState } from '../../components/admin/AdminStates';
import { Input } from '../../components/Input';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { STRINGS } from '../../lib/strings';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type PricingRuleRow = Database['public']['Tables']['pricing_rules']['Row'];

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  is_sensitive: boolean;
  category: string;
}

interface SystemConfigurationProps {
  onBack: () => void;
}

export function SystemConfiguration({ onBack }: SystemConfigurationProps) {
  const [pricingRules, setPricingRules] = useState<PricingRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PricingRuleRow | null>(null);

  const [baseFare, setBaseFare] = useState('');
  const [perKmRate, setPerKmRate] = useState('');
  const [perMinuteRate, setPerMinuteRate] = useState('');
  const [platformCommissionPercent, setPlatformCommissionPercent] = useState('');
  const [surgeMultiplier, setSurgeMultiplier] = useState('');

  const [mpSettings, setMpSettings] = useState<Record<string, string>>({});
  const [showMpToken, setShowMpToken] = useState(false);
  const [savingMp, setSavingMp] = useState(false);

  const [mapsSettings, setMapsSettings] = useState<Record<string, string>>({});
  const [showMapboxToken, setShowMapboxToken] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [savingMaps, setSavingMaps] = useState(false);

  const [mapProviders, setMapProviders] = useState({
    passenger_map_provider: 'openstreetmap',
    driver_map_provider: 'openstreetmap',
    admin_map_provider: 'openstreetmap',
  });

  useEffect(() => {
    fetchPricingRules();
    fetchMercadoPagoSettings();
    fetchMapsSettings();
  }, []);

  const fetchPricingRules = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPricingRules(data || []);

      if (data && data.length > 0) {
        const rule = data[0];
        setSelectedRule(rule);
        setBaseFare(rule.base_fare.toString());
        setPerKmRate(rule.per_km_rate.toString());
        setPerMinuteRate(rule.per_minute_rate.toString());
        setPlatformCommissionPercent(rule.platform_commission_percent.toString());
        setSurgeMultiplier(rule.surge_multiplier.toString());
      }
    } catch (error) {
      console.error('Error fetching pricing rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMercadoPagoSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'payment');

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((setting: SystemSetting) => {
        settingsMap[setting.key] = setting.value;
      });

      setMpSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching Mercado Pago settings:', error);
    }
  };

  const fetchMapsSettings = async () => {
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'maps');

      if (settingsError) throw settingsError;

      const settingsMap: Record<string, string> = {};
      settingsData?.forEach((setting: SystemSetting) => {
        settingsMap[setting.key] = setting.value;
      });

      setMapsSettings(settingsMap);

      const { data: systemSettings, error: systemError } = await supabase
        .from('system_settings')
        .select('passenger_map_provider, driver_map_provider, admin_map_provider')
        .maybeSingle();

      if (systemError) throw systemError;

      if (systemSettings) {
        setMapProviders({
          passenger_map_provider: systemSettings.passenger_map_provider || 'openstreetmap',
          driver_map_provider: systemSettings.driver_map_provider || 'openstreetmap',
          admin_map_provider: systemSettings.admin_map_provider || 'openstreetmap',
        });
      }
    } catch (error) {
      console.error('Error fetching maps settings:', error);
    }
  };

  const handleSavePricing = async () => {
    if (!baseFare || !perKmRate || !perMinuteRate || !platformCommissionPercent) {
      alert('Por favor completá todos los campos obligatorios');
      return;
    }

    setSaving(true);

    try {
      if (selectedRule) {
        const { error } = await supabase
          .from('pricing_rules')
          .update({
            base_fare: parseFloat(baseFare),
            per_km_rate: parseFloat(perKmRate),
            per_minute_rate: parseFloat(perMinuteRate),
            platform_commission_percent: parseFloat(platformCommissionPercent),
            surge_multiplier: surgeMultiplier ? parseFloat(surgeMultiplier) : 1.0,
          })
          .eq('id', selectedRule.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('pricing_rules').insert([
          {
            base_fare: parseFloat(baseFare),
            per_km_rate: parseFloat(perKmRate),
            per_minute_rate: parseFloat(perMinuteRate),
            platform_commission_percent: parseFloat(platformCommissionPercent),
            surge_multiplier: surgeMultiplier ? parseFloat(surgeMultiplier) : 1.0,
            is_active: true,
          },
        ]);

        if (error) throw error;
      }

      alert('Configuración guardada exitosamente');
      fetchPricingRules();
    } catch (error) {
      console.error('Error saving pricing rules:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMercadoPago = async () => {
    setSavingMp(true);

    try {
      const updates = [
        { key: 'mp_app_id', value: mpSettings.mp_app_id || '' },
        { key: 'mp_client_secret', value: mpSettings.mp_client_secret || '' },
        { key: 'mp_platform_seller_id', value: mpSettings.mp_platform_seller_id || '' },
        { key: 'mp_environment', value: mpSettings.mp_environment || 'test' },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq('key', update.key);

        if (error) throw error;
      }

      alert('Configuración de Mercado Pago guardada exitosamente');
      fetchMercadoPagoSettings();
    } catch (error) {
      console.error('Error saving Mercado Pago settings:', error);
      alert('Error al guardar la configuración de Mercado Pago');
    } finally {
      setSavingMp(false);
    }
  };

  const handleSaveMaps = async () => {
    setSavingMaps(true);

    try {
      const updates = [
        { key: 'maps_provider', value: mapsSettings.maps_provider || 'nominatim' },
        { key: 'mapbox_token', value: mapsSettings.mapbox_token || '' },
        { key: 'google_maps_api_key', value: mapsSettings.google_maps_api_key || '' },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq('key', update.key);

        if (error) throw error;
      }

      const { error: providerError } = await supabase
        .from('system_settings')
        .update({
          passenger_map_provider: mapProviders.passenger_map_provider,
          driver_map_provider: mapProviders.driver_map_provider,
          admin_map_provider: mapProviders.admin_map_provider,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (await supabase.from('system_settings').select('id').maybeSingle()).data?.id);

      if (providerError) throw providerError;

      alert('Configuración de mapas guardada exitosamente. Recargá la página para aplicar los cambios.');
      fetchMapsSettings();
    } catch (error) {
      console.error('Error saving maps settings:', error);
      alert('Error al guardar la configuración de mapas');
    } finally {
      setSavingMaps(false);
    }
  };

  if (loading) {
    return <AdminLoadingState message={STRINGS.messages.loadingConfiguration} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al panel
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: 'Admin', onClick: onBack },
            { label: 'Configuración del Sistema' }
          ]}
        />

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración del Sistema</h1>
          <p className="text-gray-600">Gestionar tarifas, pagos y parámetros de la plataforma</p>
        </div>

        <Card className="mb-6">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Configuración de Mapas</h2>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-900 mb-2 text-sm">
                Proveedor de Mapas por Rol
              </h4>
              <p className="text-sm text-blue-800 mb-2">
                Seleccioná el proveedor de mapas para cada tipo de usuario. Podés usar diferentes proveedores según el rol.
              </p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li><strong>OpenStreetMap:</strong> Gratis, sin configuración necesaria</li>
                <li><strong>Mapbox:</strong> Token público requerido, mejor rendimiento</li>
                <li><strong>Google Maps:</strong> API key requerida, mayor precisión</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proveedor para Pasajeros
                </label>
                <select
                  value={mapProviders.passenger_map_provider}
                  onChange={(e) => setMapProviders({ ...mapProviders, passenger_map_provider: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="openstreetmap">OpenStreetMap</option>
                  <option value="mapbox">Mapbox</option>
                  <option value="googlemaps">Google Maps</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proveedor para Conductores
                </label>
                <select
                  value={mapProviders.driver_map_provider}
                  onChange={(e) => setMapProviders({ ...mapProviders, driver_map_provider: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="openstreetmap">OpenStreetMap</option>
                  <option value="mapbox">Mapbox</option>
                  <option value="googlemaps">Google Maps</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proveedor para Admin
                </label>
                <select
                  value={mapProviders.admin_map_provider}
                  onChange={(e) => setMapProviders({ ...mapProviders, admin_map_provider: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="openstreetmap">OpenStreetMap</option>
                  <option value="mapbox">Mapbox</option>
                  <option value="googlemaps">Google Maps</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">
                Configuración de Geocodificación (Global)
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proveedor de Geocodificación <span className="text-red-500">*</span>
                </label>
                <select
                  value={mapsSettings.maps_provider || 'nominatim'}
                  onChange={(e) => setMapsSettings({ ...mapsSettings, maps_provider: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="nominatim">Nominatim (Gratis - OpenStreetMap)</option>
                  <option value="mapbox">Mapbox</option>
                  <option value="google">Google Maps</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Este proveedor se usa para convertir direcciones en coordenadas (geocodificación) y búsqueda de direcciones.
                </p>
              </div>
            </div>

            {mapsSettings.maps_provider === 'mapbox' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mapbox Public Token (pk.*) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showMapboxToken ? 'text' : 'password'}
                    value={mapsSettings.mapbox_token || ''}
                    onChange={(e) => setMapsSettings({ ...mapsSettings, mapbox_token: e.target.value })}
                    placeholder="pk.eyJ1IjoibXl1c2VyIiwiYSI6ImNrMTIzNDU2Nzg5In0..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMapboxToken(!showMapboxToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showMapboxToken ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Token público de Mapbox. Obtené uno en:{' '}
                  <a
                    href="https://account.mapbox.com/access-tokens/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600"
                  >
                    Mapbox Access Tokens
                  </a>
                </p>
              </div>
            )}

            {mapsSettings.maps_provider === 'google' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Maps API Key <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showGoogleKey ? 'text' : 'password'}
                    value={mapsSettings.google_maps_api_key || ''}
                    onChange={(e) => setMapsSettings({ ...mapsSettings, google_maps_api_key: e.target.value })}
                    placeholder="AIzaSyABC123..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogleKey(!showGoogleKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showGoogleKey ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  API key de Google Maps. Obtené una en:{' '}
                  <a
                    href="https://console.cloud.google.com/google/maps-apis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600"
                  >
                    Google Cloud Console
                  </a>
                </p>
              </div>
            )}

            <div className="pt-6 border-t border-gray-200">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900 mb-1">Importante</p>
                    <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                      <li>Los cambios requieren recargar la aplicación para aplicarse</li>
                      <li>Nominatim es gratis pero tiene límites de uso más bajos</li>
                      <li>Mapbox ofrece 100,000 solicitudes gratis por mes</li>
                      <li>Google Maps es de pago pero ofrece la mayor precisión</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleSaveMaps}
                disabled={savingMaps}
                fullWidth
              >
                <Save className="w-4 h-4 mr-2" />
                {savingMaps ? 'Guardando...' : 'Guardar Configuración de Mapas'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="mb-6">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Mercado Pago</h2>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-900 mb-2 text-sm">
                Configuración de Pagos con OAuth
              </h4>
              <p className="text-sm text-blue-800 mb-2">
                Configurá tu aplicación de Mercado Pago para que los conductores puedan conectar sus cuentas mediante OAuth.
              </p>
              <p className="text-xs text-blue-700">
                Creá tu aplicación en:{' '}
                <a
                  href="https://www.mercadopago.com.ar/developers/panel/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  Panel de Desarrolladores de Mercado Pago
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application ID (App ID) <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={mpSettings.mp_app_id || ''}
                onChange={(e) => setMpSettings({ ...mpSettings, mp_app_id: e.target.value })}
                placeholder="1234567890123456"
              />
              <p className="text-xs text-gray-500 mt-1">
                ID de tu aplicación de Mercado Pago (se encuentra en el panel de desarrolladores)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Secret <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showMpToken ? 'text' : 'password'}
                  value={mpSettings.mp_client_secret || ''}
                  onChange={(e) => setMpSettings({ ...mpSettings, mp_client_secret: e.target.value })}
                  placeholder="abcdefghijklmnopqrstuvwxyz123456"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowMpToken(!showMpToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showMpToken ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Client Secret de tu aplicación (mantenerlo en secreto)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform Seller ID <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={mpSettings.mp_platform_seller_id || ''}
                onChange={(e) => setMpSettings({ ...mpSettings, mp_platform_seller_id: e.target.value })}
                placeholder="123456789"
              />
              <p className="text-xs text-gray-500 mt-1">
                User ID o Collector ID de la cuenta de Mercado Pago de la plataforma
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entorno
              </label>
              <select
                value={mpSettings.mp_environment || 'test'}
                onChange={(e) => setMpSettings({ ...mpSettings, mp_environment: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="test">Test (Sandbox)</option>
                <option value="production">Production (Producción)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Ambiente de Mercado Pago (usar Test para pruebas)
              </p>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900 mb-1">Importante</p>
                    <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                      <li>Guardá el Client Secret de forma segura</li>
                      <li>En producción, usá credenciales de aplicación PROD</li>
                      <li>Los conductores conectarán sus propias cuentas mediante OAuth</li>
                      <li>El split de pagos se configura automáticamente (80% conductor, 20% plataforma)</li>
                      <li>Los cambios se aplican inmediatamente a todas las nuevas conexiones</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleSaveMercadoPago}
                disabled={savingMp || !mpSettings.mp_app_id || !mpSettings.mp_client_secret || !mpSettings.mp_platform_seller_id}
                fullWidth
              >
                <Save className="w-4 h-4 mr-2" />
                {savingMp ? 'Guardando...' : 'Guardar Configuración de Mercado Pago'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="mb-6">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Reglas de Tarificación</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarifa Base <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={baseFare}
                onChange={(e) => setBaseFare(e.target.value)}
                placeholder="Ej: 100.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Monto fijo que se cobra al iniciar cada viaje (en pesos)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarifa por Kilómetro <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={perKmRate}
                onChange={(e) => setPerKmRate(e.target.value)}
                placeholder="Ej: 50.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Monto que se cobra por cada kilómetro recorrido (en pesos)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarifa por Minuto <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={perMinuteRate}
                onChange={(e) => setPerMinuteRate(e.target.value)}
                placeholder="Ej: 10.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Monto que se cobra por cada minuto de viaje (en pesos)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comisión de Plataforma (%) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={platformCommissionPercent}
                onChange={(e) => setPlatformCommissionPercent(e.target.value)}
                placeholder="Ej: 20.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Porcentaje que retiene la plataforma de cada viaje (recomendado: 15-25%)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Multiplicador de Demanda
              </label>
              <Input
                type="number"
                step="0.1"
                value={surgeMultiplier}
                onChange={(e) => setSurgeMultiplier(e.target.value)}
                placeholder="Ej: 1.0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Factor multiplicador para períodos de alta demanda (1.0 = sin aumento)
              </p>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">
                  Cálculo de Tarifa Estimada
                </h4>
                <p className="text-sm text-blue-800 mb-2">
                  Tarifa = (Base + Km × Tarifa/km + Minutos × Tarifa/min) × Multiplicador
                </p>
                <p className="text-xs text-blue-700">
                  Ejemplo con valores actuales:{' '}
                  {baseFare && perKmRate && perMinuteRate
                    ? `($${baseFare} + 10km × $${perKmRate} + 15min × $${perMinuteRate}) × ${surgeMultiplier || 1} = $${(
                        (parseFloat(baseFare) +
                          10 * parseFloat(perKmRate) +
                          15 * parseFloat(perMinuteRate)) *
                        parseFloat(surgeMultiplier || '1')
                      ).toFixed(2)}`
                    : 'Completá los campos para ver el ejemplo'}
                </p>
              </div>

              <Button
                variant="primary"
                onClick={handleSavePricing}
                disabled={saving}
                fullWidth
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="bg-yellow-50 border-2 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">Importante</h3>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>
                  Los cambios en las tarifas se aplicarán inmediatamente a todos los nuevos
                  viajes
                </li>
                <li>
                  La comisión de plataforma se divide automáticamente mediante Mercado Pago
                  Marketplace
                </li>
                <li>
                  El conductor recibe el monto restante después de la comisión de forma
                  instantánea
                </li>
                <li>Asegurate de que las tarifas sean competitivas en tu mercado</li>
              </ul>
            </div>
          </div>
        </Card>

        {pricingRules.length > 0 && (
          <Card className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Historial de Configuraciones</h3>
            <div className="space-y-3">
              {pricingRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Base: ${rule.base_fare} | Km: ${rule.per_km_rate} | Min: $
                      {rule.per_minute_rate}
                    </p>
                    <p className="text-xs text-gray-600">
                      Comisión: {rule.platform_commission_percent}% | Multiplicador:{' '}
                      {rule.surge_multiplier_max}x
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">
                      {new Date(rule.created_at).toLocaleDateString('es-AR')}
                    </p>
                    {rule.is_active && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Activa
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
