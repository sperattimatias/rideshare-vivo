import { useState, useEffect } from 'react';
import { ArrowLeft, Car, FileText, CreditCard, CheckCircle, XCircle, Clock, CreditCard as Edit, AlertCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type DriverRow = Database['public']['Tables']['drivers']['Row'];

interface DriverProfileProps {
  onBack: () => void;
  onEdit: () => void;
}

export function DriverProfile({ onBack, onEdit }: DriverProfileProps) {
  const { user, profile } = useAuth();
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriverData();
  }, [user]);

  const fetchDriverData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setDriver(data);
    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4" />
            Activo
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4" />
            Pendiente de Aprobación
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4" />
            Suspendido
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4" />
            Rechazado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <Clock className="w-4 h-4" />
            Inactivo
          </span>
        );
    }
  };

  const getMPStatusBadge = (mpStatus: string) => {
    switch (mpStatus) {
      case 'LINKED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4" />
            Vinculado
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4" />
            Suspendido
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4" />
            Rechazado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4" />
            Pendiente
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Perfil no encontrado</h2>
            <p className="text-gray-600 mb-4">No se pudo cargar tu perfil de conductor</p>
            <Button variant="primary" onClick={onBack}>
              Volver al Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const profileComplete = driver.vehicle_plate && driver.driver_license_number;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Perfil de Conductor</h1>
            <p className="text-gray-600">{profile?.full_name}</p>
          </div>
          {profileComplete && (
            <Button variant="outline" onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>

        <div className="grid gap-6">
          <Card>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Estado de la Cuenta</h2>
              {getStatusBadge(driver.status)}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Score</p>
                <p className="text-2xl font-bold text-gray-900">{driver.score.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Calificación Promedio</p>
                <p className="text-2xl font-bold text-gray-900">{driver.average_rating.toFixed(2)} ⭐</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Viajes Totales</p>
                <p className="text-2xl font-bold text-gray-900">{driver.total_trips}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Calificaciones</p>
                <p className="text-2xl font-bold text-gray-900">{driver.total_ratings}</p>
              </div>
            </div>

            {!driver.can_receive_trips && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">No podés recibir viajes todavía</p>
                    <p className="text-sm text-yellow-800 mt-1">
                      Requisitos pendientes:
                      {!driver.documents_validated && ' Validación de documentos.'}
                      {driver.mp_status !== 'LINKED' && ' Vinculación de Mercado Pago.'}
                      {driver.score < 60 && ' Score mínimo de 60.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Car className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Información del Vehículo</h2>
            </div>

            {driver.vehicle_plate ? (
              <div>
                {driver.vehicle_photo_url && (
                  <img
                    src={driver.vehicle_photo_url}
                    alt="Vehículo"
                    className="w-full max-w-md h-64 object-cover rounded-lg mb-4 border-2 border-gray-200"
                  />
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Marca y Modelo</p>
                    <p className="font-medium text-gray-900">
                      {driver.vehicle_brand} {driver.vehicle_model}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Año</p>
                    <p className="font-medium text-gray-900">{driver.vehicle_year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Color</p>
                    <p className="font-medium text-gray-900">{driver.vehicle_color}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Patente</p>
                    <p className="font-medium text-gray-900 uppercase">{driver.vehicle_plate}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">No hay información del vehículo registrada</p>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold">Documentos</h2>
              </div>
              {driver.documents_validated ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckCircle className="w-4 h-4" />
                  Validados
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  <Clock className="w-4 h-4" />
                  Pendiente de Validación
                </span>
              )}
            </div>

            {driver.driver_license_number ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Número de Licencia</p>
                  <p className="font-medium text-gray-900">{driver.driver_license_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vencimiento de Licencia</p>
                  <p className="font-medium text-gray-900">
                    {driver.driver_license_expiry
                      ? new Date(driver.driver_license_expiry).toLocaleDateString('es-AR')
                      : 'No especificado'}
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  {driver.driver_license_photo_url && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Licencia</p>
                      <div className="bg-green-100 text-green-800 p-3 rounded-lg text-center text-sm font-medium">
                        ✓ Subida
                      </div>
                    </div>
                  )}
                  {driver.vehicle_registration_photo_url && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Cédula</p>
                      <div className="bg-green-100 text-green-800 p-3 rounded-lg text-center text-sm font-medium">
                        ✓ Subida
                      </div>
                    </div>
                  )}
                  {driver.insurance_photo_url && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Seguro</p>
                      <div className="bg-green-100 text-green-800 p-3 rounded-lg text-center text-sm font-medium">
                        ✓ Subida
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-600">No hay documentos registrados</p>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold">Mercado Pago</h2>
              </div>
              {getMPStatusBadge(driver.mp_status)}
            </div>

            {driver.mp_status === 'LINKED' ? (
              <div>
                <p className="text-sm text-gray-600">Email de cuenta</p>
                <p className="font-medium text-gray-900">{driver.mp_account_email}</p>
                <p className="text-sm text-gray-600 mt-2">Vinculado el</p>
                <p className="font-medium text-gray-900">
                  {driver.mp_linked_at
                    ? new Date(driver.mp_linked_at).toLocaleDateString('es-AR')
                    : 'No disponible'}
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  La vinculación con Mercado Pago estará disponible próximamente. Una vez que tus documentos sean validados, podrás vincular tu cuenta.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
