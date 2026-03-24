import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, User, Car, FileText, ExternalLink } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type DriverRow = Database['public']['Tables']['drivers']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

interface DriverWithProfile extends DriverRow {
  user_profile?: UserProfileRow;
}

interface DriverVerificationProps {
  onBack: () => void;
}

export function DriverVerification({ onBack }: DriverVerificationProps) {
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedDriver, setSelectedDriver] = useState<DriverWithProfile | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, [filter]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('drivers')
        .select(`
          *,
          user_profile:user_profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('verification_status', 'PENDING');
      } else if (filter === 'approved') {
        query = query.eq('verification_status', 'APPROVED');
      } else if (filter === 'rejected') {
        query = query.eq('verification_status', 'REJECTED');
      }

      const { data, error } = await query;

      if (error) throw error;
      setDrivers(data as DriverWithProfile[]);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (driverId: string) => {
    if (!confirm('¿Estás seguro de aprobar este conductor?')) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          verification_status: 'APPROVED',
          verified_at: new Date().toISOString(),
        })
        .eq('id', driverId);

      if (error) throw error;

      alert('Conductor aprobado exitosamente');
      setSelectedDriver(null);
      fetchDrivers();
    } catch (error) {
      console.error('Error approving driver:', error);
      alert('Error al aprobar conductor');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (driverId: string) => {
    const reason = prompt('Motivo del rechazo (opcional):');
    if (reason === null) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          verification_status: 'REJECTED',
          rejection_reason: reason || null,
        })
        .eq('id', driverId);

      if (error) throw error;

      alert('Conductor rechazado');
      setSelectedDriver(null);
      fetchDrivers();
    } catch (error) {
      console.error('Error rejecting driver:', error);
      alert('Error al rechazar conductor');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          Aprobado
        </span>
      );
    } else if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" />
          Rechazado
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertCircle className="w-3 h-3" />
          Pendiente
        </span>
      );
    }
  };

  if (selectedDriver) {
    const profile = selectedDriver.user_profile;

    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => setSelectedDriver(null)}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver a la lista
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">Verificación de Conductor</h1>
              {getStatusBadge(selectedDriver.verification_status)}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Información Personal</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                    {profile?.profile_photo_url ? (
                      <img
                        src={profile.profile_photo_url}
                        alt={profile.full_name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{profile?.full_name}</p>
                    <p className="text-sm text-gray-600">{profile?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Teléfono</p>
                    <p className="font-medium text-gray-900">{profile?.phone || 'No registrado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha de registro</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedDriver.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">DNI</p>
                    <p className="font-medium text-gray-900">{selectedDriver.dni || 'No registrado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha de nacimiento</p>
                    <p className="font-medium text-gray-900">
                      {selectedDriver.birth_date
                        ? new Date(selectedDriver.birth_date).toLocaleDateString('es-AR')
                        : 'No registrado'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 mb-6">
                <Car className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Información del Vehículo</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Marca</p>
                  <p className="font-medium text-gray-900">{selectedDriver.vehicle_brand}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Modelo</p>
                  <p className="font-medium text-gray-900">{selectedDriver.vehicle_model}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Año</p>
                  <p className="font-medium text-gray-900">{selectedDriver.vehicle_year}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Color</p>
                  <p className="font-medium text-gray-900">{selectedDriver.vehicle_color}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Patente</p>
                  <p className="font-medium text-gray-900 uppercase">
                    {selectedDriver.vehicle_plate}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Capacidad</p>
                  <p className="font-medium text-gray-900">
                    {selectedDriver.vehicle_capacity} pasajeros
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="mb-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Documentación</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {selectedDriver.license_photo_url && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Licencia de conducir</p>
                  <a
                    href={selectedDriver.license_photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver documento
                  </a>
                </div>
              )}

              {selectedDriver.vehicle_registration_url && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Registro del vehículo</p>
                  <a
                    href={selectedDriver.vehicle_registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver documento
                  </a>
                </div>
              )}

              {selectedDriver.insurance_url && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Seguro del vehículo</p>
                  <a
                    href={selectedDriver.insurance_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver documento
                  </a>
                </div>
              )}
            </div>

            {!selectedDriver.license_photo_url &&
              !selectedDriver.vehicle_registration_url &&
              !selectedDriver.insurance_url && (
                <p className="text-sm text-gray-600">No hay documentos cargados</p>
              )}
          </Card>

          <Card className="mb-6 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-4">Estado de Mercado Pago</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Cuenta vinculada</p>
                <p className="font-medium text-gray-900">
                  {selectedDriver.mp_seller_id ? (
                    <span className="text-green-600">Sí - {selectedDriver.mp_seller_id}</span>
                  ) : (
                    <span className="text-red-600">No vinculada</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Score del conductor</p>
                <p className="font-medium text-gray-900">{selectedDriver.score}/100</p>
              </div>
            </div>
          </Card>

          {selectedDriver.rejection_reason && (
            <Card className="mb-6 bg-red-50 border-2 border-red-200">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Motivo del rechazo</h3>
                  <p className="text-sm text-red-800">{selectedDriver.rejection_reason}</p>
                </div>
              </div>
            </Card>
          )}

          {selectedDriver.verification_status === 'PENDING' && (
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => handleReject(selectedDriver.id)}
                disabled={processing}
                fullWidth
              >
                <XCircle className="w-4 h-4 mr-2" />
                {processing ? 'Procesando...' : 'Rechazar'}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleApprove(selectedDriver.id)}
                disabled={processing}
                fullWidth
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {processing ? 'Procesando...' : 'Aprobar Conductor'}
              </Button>
            </div>
          )}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verificación de Conductores</h1>
          <p className="text-gray-600">Revisar y aprobar solicitudes de nuevos conductores</p>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'pending' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Pendientes
          </Button>
          <Button
            variant={filter === 'approved' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('approved')}
          >
            Aprobados
          </Button>
          <Button
            variant={filter === 'rejected' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('rejected')}
          >
            Rechazados
          </Button>
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todos
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando conductores...</p>
            </div>
          </div>
        ) : drivers.length === 0 ? (
          <Card className="text-center py-12">
            <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No hay conductores {filter !== 'all' && filter}
            </h2>
            <p className="text-gray-600">
              {filter === 'pending' && 'No hay solicitudes pendientes de revisión'}
              {filter === 'approved' && 'No hay conductores aprobados todavía'}
              {filter === 'rejected' && 'No hay conductores rechazados'}
              {filter === 'all' && 'No hay conductores registrados en el sistema'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {drivers.map((driver) => {
              const profile = driver.user_profile;

              return (
                <Card
                  key={driver.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedDriver(driver)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      {profile?.profile_photo_url ? (
                        <img
                          src={profile.profile_photo_url}
                          alt={profile.full_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-gray-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {profile?.full_name}
                        </h3>
                        {getStatusBadge(driver.verification_status)}
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Email</p>
                          <p className="font-medium text-gray-900">{profile?.email}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Vehículo</p>
                          <p className="font-medium text-gray-900">
                            {driver.vehicle_brand} {driver.vehicle_model}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Registrado</p>
                          <p className="font-medium text-gray-900">
                            {new Date(driver.created_at).toLocaleDateString('es-AR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
