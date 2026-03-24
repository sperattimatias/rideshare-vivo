import { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, MapPin, Save, AlertCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type PricingRuleRow = Database['public']['Tables']['pricing_rules']['Row'];

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

  useEffect(() => {
    fetchPricingRules();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración del Sistema</h1>
          <p className="text-gray-600">Gestionar tarifas y parámetros de la plataforma</p>
        </div>

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
                      {rule.surge_multiplier}x
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
