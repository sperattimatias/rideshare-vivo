import { useState, useEffect } from 'react';
import { Plus, MapPin, CreditCard as Edit2, Trash2, Save, X, AlertCircle, Map } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { AdminLoadingState, AdminEmptyState } from '../../components/admin/AdminStates';
import { Input } from '../../components/Input';
import { Textarea } from '../../components/Textarea';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { LeafletMap } from '../../components/LeafletMap';
import { LiveMap } from '../../components/LiveMap';
import { ZoneDrawingMap } from '../../components/ZoneDrawingMap';

type PricingRuleRow = Database['public']['Tables']['pricing_rules']['Row'];

interface ServiceZone {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  boundary_points: Array<{ lat: number; lon: number }>;
  center_lat: number;
  center_lon: number;
  pricing_rule_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ServiceZonesProps {
  onBack: () => void;
}

export function ServiceZones({ onBack }: ServiceZonesProps) {
  const [zones, setZones] = useState<ServiceZone[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState<ServiceZone | null>(null);
  const [useRealMap, setUseRealMap] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    pricing_rule_id: '',
  });

  const [drawnPoints, setDrawnPoints] = useState<Array<{ lat: number; lon: number }>>([]);

  useEffect(() => {
    fetchZones();
    fetchPricingRules();
  }, []);

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from('service_zones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPricingRules = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPricingRules(data || []);
    } catch (error) {
      console.error('Error fetching pricing rules:', error);
    }
  };

  const handleEdit = (zone: ServiceZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description,
      is_active: zone.is_active,
      pricing_rule_id: zone.pricing_rule_id || '',
    });
    setDrawnPoints(zone.boundary_points || []);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta zona de servicio?')) return;

    try {
      const { error } = await supabase
        .from('service_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Zona eliminada exitosamente');
      fetchZones();
    } catch (error) {
      console.error('Error deleting zone:', error);
      alert('Error al eliminar la zona');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (drawnPoints.length < 3) {
      alert('Necesitás dibujar al menos 3 puntos en el mapa para crear una zona');
      return;
    }

    try {
      const centerLat =
        drawnPoints.reduce((sum, p) => sum + p.lat, 0) / drawnPoints.length;
      const centerLon =
        drawnPoints.reduce((sum, p) => sum + p.lon, 0) / drawnPoints.length;

      const zoneData = {
        name: formData.name,
        description: formData.description,
        is_active: formData.is_active,
        center_lat: centerLat,
        center_lon: centerLon,
        boundary_points: drawnPoints,
        pricing_rule_id: formData.pricing_rule_id || null,
        updated_at: new Date().toISOString(),
      };

      if (editingZone) {
        const { error } = await supabase
          .from('service_zones')
          .update(zoneData)
          .eq('id', editingZone.id);

        if (error) throw error;
        alert('Zona actualizada exitosamente');
      } else {
        const { error } = await supabase
          .from('service_zones')
          .insert([zoneData]);

        if (error) throw error;
        alert('Zona creada exitosamente');
      }

      setShowForm(false);
      setEditingZone(null);
      setFormData({
        name: '',
        description: '',
        is_active: true,
        pricing_rule_id: '',
      });
      setDrawnPoints([]);
      fetchZones();
    } catch (error) {
      console.error('Error saving zone:', error);
      alert('Error al guardar la zona');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingZone(null);
    setFormData({
      name: '',
      description: '',
      is_active: true,
      pricing_rule_id: '',
    });
    setDrawnPoints([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Cargando zonas de servicio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs
          items={[
            { label: 'Panel Admin', onClick: onBack },
            { label: 'Zonas de Servicio' },
          ]}
        />

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Zonas de Servicio</h1>
            <p className="text-gray-600">Definí y gestioná las zonas donde opera la plataforma</p>
          </div>
          {!showForm && (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Nueva Zona
            </Button>
          )}
        </div>

        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Mapa de Zonas</h2>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseRealMap(!useRealMap)}
              >
                <Map className="w-4 h-4 mr-2" />
                {useRealMap ? 'Mapa Simple' : 'Mapa Real (OSM)'}
              </Button>
            </div>
          </div>
          {useRealMap ? (
            <LeafletMap className="h-[400px]" />
          ) : (
            <LiveMap className="h-[400px]" />
          )}
        </Card>

        {showForm && (
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingZone ? 'Editar Zona' : 'Nueva Zona de Servicio'}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">
                  Cómo crear una zona de servicio
                </h4>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Hacé clic en el mapa para agregar puntos y dibujar el polígono</li>
                  <li>Necesitás al menos 3 puntos para crear una zona válida</li>
                  <li>Podés asignar reglas de precios específicas por zona</li>
                  <li>Las zonas existentes aparecen en azul con líneas punteadas</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dibujá la Zona en el Mapa <span className="text-red-500">*</span>
                </label>
                <ZoneDrawingMap
                  className="h-[500px]"
                  center={{ lat: -32.9468, lon: -60.6393 }}
                  zoom={13}
                  initialPoints={drawnPoints}
                  onPointsChange={setDrawnPoints}
                  existingZones={zones
                    .filter((z) => !editingZone || z.id !== editingZone.id)
                    .map((z) => ({
                      id: z.id,
                      name: z.name,
                      boundary_points: z.boundary_points,
                    }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Zona <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Centro, Zona Norte, Palermo, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Regla de Precios (Opcional)
                  </label>
                  <select
                    value={formData.pricing_rule_id}
                    onChange={(e) => setFormData({ ...formData, pricing_rule_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sin regla personalizada</option>
                    {pricingRules.map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.city || 'Regla General'} - Base: ${rule.base_fare}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción de la zona de servicio..."
                  rows={3}
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Zona activa</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Solo las zonas activas se usan para validar solicitudes de viaje
                </p>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <Button type="submit" variant="primary">
                  <Save className="w-4 h-4 mr-2" />
                  {editingZone ? 'Actualizar Zona' : 'Crear Zona'}
                </Button>
                <Button type="button" variant="secondary" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {!showForm && zones.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay zonas de servicio configuradas
              </h3>
              <p className="text-gray-600 mb-6">
                Creá tu primera zona de servicio para comenzar a operar
              </p>
              <Button variant="primary" onClick={() => setShowForm(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Crear Primera Zona
              </Button>
            </div>
          </Card>
        )}

        {!showForm && zones.length > 0 && (
          <div className="space-y-4">
            {zones.map((zone) => (
              <Card key={zone.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
                      {zone.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                          Activa
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                          Inactiva
                        </span>
                      )}
                    </div>

                    {zone.description && (
                      <p className="text-gray-600 text-sm mb-3">{zone.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Centro</p>
                        <p className="font-medium text-gray-900">
                          {Number(zone.center_lat).toFixed(4)}, {Number(zone.center_lon).toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Puntos</p>
                        <p className="font-medium text-gray-900">
                          {zone.boundary_points.length} coordenadas
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Precio</p>
                        <p className="font-medium text-gray-900">
                          {zone.pricing_rule_id ? 'Personalizado' : 'Por defecto'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Creada</p>
                        <p className="font-medium text-gray-900">
                          {new Date(zone.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(zone)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(zone.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Sobre las zonas de servicio
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Las zonas definen dónde pueden solicitarse viajes</li>
                <li>Podés tener múltiples zonas activas con diferentes precios</li>
                <li>Las zonas inactivas no se usan para validación</li>
                <li>Los polígonos se definen con arrays de coordenadas lat/lon</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
