import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Car,
  FileText,
  Clock,
  Shield,
  CreditCard,
  Ban,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import {
  approveDriver,
  rejectDriver,
  suspendDriver,
  reactivateDriver,
} from '../../lib/adminOperations';

interface DriverWithProfile {
  id: string;
  user_id: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  vehicle_plate?: string;
  vehicle_photo_url?: string;
  driver_license_number?: string;
  driver_license_expiry?: string;
  driver_license_photo_url?: string;
  vehicle_registration_photo_url?: string;
  insurance_photo_url?: string;
  documents_validated: boolean;
  documents_validated_at?: string;
  mp_seller_id?: string;
  mp_account_email?: string;
  mp_status?: string;
  status: string;
  score?: number;
  total_trips?: number;
  average_rating?: number;
  created_at: string;
  user_profiles?: {
    full_name: string;
    phone?: string;
    email?: string;
  };
}

interface VerificationHistory {
  id: string;
  action: string;
  previous_status?: string;
  new_status?: string;
  notes?: string;
  created_at: string;
  admin_users: {
    user_profiles: {
      full_name: string;
    };
  };
}

interface DriverVerificationEnhancedProps {
  onBack: () => void;
}

export default function DriverVerificationEnhanced({ onBack }: DriverVerificationEnhancedProps) {
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('PENDING_APPROVAL');
  const [selectedDriver, setSelectedDriver] = useState<DriverWithProfile | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<VerificationHistory[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, [filter]);

  useEffect(() => {
    if (selectedDriver) {
      loadVerificationHistory(selectedDriver.id);
    }
  }, [selectedDriver]);

  async function fetchDrivers() {
    setLoading(true);
    try {
      let query = supabase
        .from('drivers')
        .select(`
          *,
          user_profiles(full_name, phone, email)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDrivers(data as any);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadVerificationHistory(driverId: string) {
    const { data, error } = await supabase
      .from('driver_verification_history')
      .select(`
        *,
        admin_users(
          user_profiles(full_name)
        )
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setVerificationHistory(data as any);
    }
  }

  async function handleApprove() {
    if (!selectedDriver) return;

    const notes = prompt('Add approval notes (optional):');
    if (notes === null) return;

    setProcessing(true);
    try {
      await approveDriver(selectedDriver.id, notes || undefined);
      alert('Driver approved successfully');
      setSelectedDriver(null);
      await fetchDrivers();
    } catch (error) {
      console.error('Error approving driver:', error);
      alert('Failed to approve driver');
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!selectedDriver) return;

    const reason = prompt('Razón de rechazo (requerida):');
    if (!reason) {
      alert('La razón de rechazo es requerida');
      return;
    }

    setProcessing(true);
    try {
      await rejectDriver(selectedDriver.id, reason);
      alert('Conductor rechazado');
      setSelectedDriver(null);
      await fetchDrivers();
    } catch (error) {
      console.error('Error rejecting driver:', error);
      alert('Error al rechazar conductor');
    } finally {
      setProcessing(false);
    }
  }

  async function handleSuspend() {
    if (!selectedDriver) return;

    const reason = prompt('Razón de suspensión (requerida):');
    if (!reason) {
      alert('La razón de suspensión es requerida');
      return;
    }

    setProcessing(true);
    try {
      await suspendDriver(selectedDriver.id, reason);
      alert('Conductor suspendido');
      setSelectedDriver(null);
      await fetchDrivers();
    } catch (error) {
      console.error('Error suspending driver:', error);
      alert('Error al suspender conductor');
    } finally {
      setProcessing(false);
    }
  }

  async function handleReactivate() {
    if (!selectedDriver) return;

    const notes = prompt('Notas de reactivación (opcional):');
    if (notes === null) return;

    setProcessing(true);
    try {
      await reactivateDriver(selectedDriver.id, notes || undefined);
      alert('Conductor reactivado');
      setSelectedDriver(null);
      await fetchDrivers();
    } catch (error) {
      console.error('Error reactivating driver:', error);
      alert('Error al reactivar conductor');
    } finally {
      setProcessing(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Activo
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            Rechazado
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Ban className="w-3 h-3" />
            Suspendido
          </span>
        );
      default:
        return <span className="text-xs text-gray-600">{status}</span>;
    }
  };

  if (selectedDriver) {
    const profile = selectedDriver.user_profiles;
    const documentsComplete =
      selectedDriver.driver_license_photo_url &&
      selectedDriver.vehicle_registration_photo_url &&
      selectedDriver.insurance_photo_url;

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setSelectedDriver(null)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver a la lista
          </button>

          <div className="mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {profile?.full_name}
                </h1>
                <p className="text-gray-600">{profile?.email}</p>
                {profile?.phone && <p className="text-gray-600">{profile.phone}</p>}
              </div>
              {getStatusBadge(selectedDriver.status)}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Información del Vehículo */}
            <Card>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Car className="w-6 h-6 text-blue-600" />
                Información del Vehículo
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Vehículo</p>
                  <p className="font-medium">
                    {selectedDriver.vehicle_brand} {selectedDriver.vehicle_model} (
                    {selectedDriver.vehicle_year})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Color</p>
                  <p className="font-medium">{selectedDriver.vehicle_color || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Patente</p>
                  <p className="font-medium">
                    {selectedDriver.vehicle_plate?.toUpperCase() || 'N/A'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Licencia de Conducir */}
            <Card>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Licencia de Conducir
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Número de Licencia</p>
                  <p className="font-medium">{selectedDriver.driver_license_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha de Vencimiento</p>
                  <p className="font-medium">
                    {selectedDriver.driver_license_expiry
                      ? new Date(selectedDriver.driver_license_expiry).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Mercado Pago Status */}
            <Card>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-blue-600" />
                Mercado Pago
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <p className="font-medium">{selectedDriver.mp_status || 'PENDING'}</p>
                </div>
                {selectedDriver.mp_account_email && (
                  <div>
                    <p className="text-sm text-gray-600">Email de Cuenta</p>
                    <p className="font-medium">{selectedDriver.mp_account_email}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Driver Stats */}
            <Card>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <User className="w-6 h-6 text-blue-600" />
                Estadísticas
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Total de Viajes</p>
                  <p className="font-medium">{selectedDriver.total_trips || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valoración Promedio</p>
                  <p className="font-medium">{selectedDriver.average_rating || 5.0}/5</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Puntaje</p>
                  <p className="font-medium">{selectedDriver.score || 100}/100</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Documentos */}
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Documentos
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {/* Licencia de Conducir Photo */}
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Licencia de Conducir</p>
                {selectedDriver.driver_license_photo_url ? (
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={selectedDriver.driver_license_photo_url}
                      alt="Licencia de Conducir"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Cédula del Vehículo */}
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Cédula del Vehículo
                </p>
                {selectedDriver.vehicle_registration_photo_url ? (
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={selectedDriver.vehicle_registration_photo_url}
                      alt="Cédula del Vehículo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Seguro */}
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Seguro</p>
                {selectedDriver.insurance_photo_url ? (
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={selectedDriver.insurance_photo_url}
                      alt="Seguro"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {!documentsComplete && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    Some documents are missing. All documents are required for approval.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Verification History */}
          {verificationHistory.length > 0 && (
            <Card className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Verification History</h2>
              <div className="space-y-3">
                {verificationHistory.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-3 border-b last:border-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{item.action}</p>
                          <p className="text-sm text-gray-600">
                            {item.admin_users.user_profiles.full_name}
                          </p>
                          {item.notes && (
                            <p className="text-sm text-gray-700 mt-1">{item.notes}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="flex flex-wrap gap-3">
              {selectedDriver.status === 'PENDING_APPROVAL' && (
                <>
                  <Button onClick={handleApprove} disabled={processing || !documentsComplete}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprobar Conductor
                  </Button>
                  <Button variant="secondary" onClick={handleReject} disabled={processing}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Rechazar
                  </Button>
                </>
              )}

              {selectedDriver.status === 'ACTIVE' && (
                <Button variant="secondary" onClick={handleSuspend} disabled={processing}>
                  <Ban className="w-4 h-4 mr-2" />
                  Suspender Conductor
                </Button>
              )}

              {selectedDriver.status === 'SUSPENDED' && (
                <Button onClick={handleReactivate} disabled={processing}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reactivar Conductor
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Panel
        </Button>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Verification</h1>
          <p className="text-gray-600">Review and approve driver applications</p>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'PENDING_APPROVAL' ? 'primary' : 'outline'}
            onClick={() => setFilter('PENDING_APPROVAL')}
          >
            Pending
          </Button>
          <Button
            variant={filter === 'ACTIVE' ? 'primary' : 'outline'}
            onClick={() => setFilter('ACTIVE')}
          >
            Active
          </Button>
          <Button
            variant={filter === 'SUSPENDED' ? 'primary' : 'outline'}
            onClick={() => setFilter('SUSPENDED')}
          >
            Suspended
          </Button>
          <Button
            variant={filter === 'REJECTED' ? 'primary' : 'outline'}
            onClick={() => setFilter('REJECTED')}
          >
            Rejected
          </Button>
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading drivers...</p>
            </div>
          </div>
        ) : drivers.length === 0 ? (
          <Card className="text-center py-12">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No drivers found</h2>
            <p className="text-gray-600">No drivers match the current filter</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((driver) => (
              <Card
                key={driver.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedDriver(driver)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {driver.user_profiles?.full_name}
                      </p>
                      <p className="text-sm text-gray-600">{driver.user_profiles?.email}</p>
                    </div>
                  </div>
                  {getStatusBadge(driver.status)}
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600">Vehicle</p>
                    <p className="font-medium">
                      {driver.vehicle_brand} {driver.vehicle_model}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-gray-600">Trips</p>
                      <p className="font-medium">{driver.total_trips || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Rating</p>
                      <p className="font-medium">{driver.average_rating || 5.0}/5</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Score</p>
                      <p className="font-medium">{driver.score || 100}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    Joined {new Date(driver.created_at).toLocaleDateString()}
                  </span>
                  {driver.documents_validated ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-yellow-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Unverified
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
