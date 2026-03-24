import { useState } from 'react';
import { LogOut, Users, Car, TrendingUp, DollarSign, AlertCircle, FileText, Settings } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DriverVerification } from './admin/DriverVerification';
import { PlatformAnalytics } from './admin/PlatformAnalytics';
import { TripMonitoring } from './admin/TripMonitoring';
import { UserManagement } from './admin/UserManagement';
import { SystemConfiguration } from './admin/SystemConfiguration';

type AdminView =
  | 'overview'
  | 'driver-verification'
  | 'analytics'
  | 'trip-monitoring'
  | 'user-management'
  | 'configuration';

export function AdminDashboard() {
  const { profile } = useAuth();
  const [view, setView] = useState<AdminView>('overview');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (view === 'driver-verification') {
    return <DriverVerification onBack={() => setView('overview')} />;
  }

  if (view === 'analytics') {
    return <PlatformAnalytics onBack={() => setView('overview')} />;
  }

  if (view === 'trip-monitoring') {
    return <TripMonitoring onBack={() => setView('overview')} />;
  }

  if (view === 'user-management') {
    return <UserManagement onBack={() => setView('overview')} />;
  }

  if (view === 'configuration') {
    return <SystemConfiguration onBack={() => setView('overview')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>
                <p className="text-sm text-gray-600">VIVO Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-xs text-gray-600">Administrador</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Panel Principal</h2>
          <p className="text-gray-600">Gestión y monitoreo de la plataforma VIVO</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            className="hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => setView('driver-verification')}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <Car className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Verificación de Conductores</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Revisar y aprobar solicitudes de conductores
                </p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <AlertCircle className="w-3 h-3" />
                    Pendientes
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card
            className="hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => setView('analytics')}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-colors">
                <TrendingUp className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Análisis de Plataforma</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Métricas, estadísticas y reportes
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Datos en tiempo real</span>
                </div>
              </div>
            </div>
          </Card>

          <Card
            className="hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => setView('trip-monitoring')}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <FileText className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Monitoreo de Viajes</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Supervisar viajes activos y historial
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Vista en tiempo real</span>
                </div>
              </div>
            </div>
          </Card>

          <Card
            className="hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => setView('user-management')}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <Users className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Gestión de Usuarios</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Administrar pasajeros y conductores
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Base de usuarios</span>
                </div>
              </div>
            </div>
          </Card>

          <Card
            className="hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => setView('configuration')}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-600 transition-colors">
                <Settings className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Configuración del Sistema</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Tarifas, zonas de servicio y parámetros
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Configuración global</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-1">Ingresos de Plataforma</h3>
                <p className="text-sm text-green-700 mb-2">Comisiones del mes actual</p>
                <p className="text-2xl font-bold text-green-900">$0.00</p>
                <p className="text-xs text-green-700 mt-1">Actualizado en tiempo real</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Conductores Activos</h3>
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">0</p>
            <p className="text-sm text-gray-600">Disponibles ahora</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Viajes Hoy</h3>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">0</p>
            <p className="text-sm text-gray-600">Completados y en curso</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Usuarios Totales</h3>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">0</p>
            <p className="text-sm text-gray-600">Pasajeros y conductores</p>
          </Card>
        </div>

        <Card className="mt-8 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Centro de Administración</h3>
              <p className="text-sm text-blue-800 mb-3">
                Desde este panel podés gestionar todos los aspectos de la plataforma VIVO.
                Seleccioná una sección para comenzar.
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Verificar y aprobar nuevos conductores</li>
                <li>Monitorear viajes en tiempo real</li>
                <li>Revisar métricas y análisis de la plataforma</li>
                <li>Gestionar usuarios y configuraciones</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
