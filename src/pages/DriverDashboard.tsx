import { useState, useEffect } from 'react';
import { Car, DollarSign, Star, AlertCircle, User, CheckCircle, XCircle, Clock, TrendingUp, MessageCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { NotificationCenter } from '../components/NotificationCenter';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CompleteProfile } from './driver/CompleteProfile';
import { DriverProfile } from './driver/DriverProfile';
import { AvailabilityToggle } from './driver/AvailabilityToggle';
import { TripRequests } from './driver/TripRequests';
import { ActiveTrip } from './driver/ActiveTrip';
import { Earnings } from './driver/Earnings';
import { Support } from './driver/Support';
import type { Database } from '../lib/database.types';
import { calculateDriverEarnings } from '../lib/pricing';

type DriverRow = Database['public']['Tables']['drivers']['Row'];

export function DriverDashboard() {
  const { profile, signOut } = useAuth();
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'complete' | 'profile' | 'earnings' | 'support'>('dashboard');
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    fetchDriverData();
    fetchUnreadMessages();
    const interval = setInterval(fetchUnreadMessages, 10000);
    return () => clearInterval(interval);
  }, [profile]);

  useEffect(() => {
    if (driver) {
      fetchWeeklyEarnings();
    }
  }, [driver]);

  const fetchUnreadMessages = async () => {
    if (!profile) return;

    try {
      const { data: conversations } = await supabase
        .from('support_conversations')
        .select('id')
        .eq('user_id', profile.id)
        .in('status', ['OPEN', 'IN_PROGRESS', 'WAITING_RESPONSE']);

      if (!conversations || conversations.length === 0) {
        setUnreadMessages(0);
        return;
      }

      const conversationIds = conversations.map((c) => c.id);

      const { count } = await supabase
        .from('support_conversation_messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', profile.id)
        .is('read_at', null);

      setUnreadMessages(count || 0);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  };

  const fetchDriverData = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      setDriver(data);
    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyEarnings = async () => {
    if (!driver) return;

    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const { data, error } = await supabase
        .from('trips')
        .select('final_fare')
        .eq('driver_id', driver.id)
        .eq('status', 'COMPLETED')
        .gte('completed_at', weekStart.toISOString());

      if (error) throw error;

      const total = data.reduce(
        (sum, trip) => sum + (trip.final_fare ? calculateDriverEarnings(trip.final_fare) : 0),
        0
      );

      setWeeklyEarnings(total);
    } catch (error) {
      console.error('Error fetching weekly earnings:', error);
    }
  };

  const handleCompleteProfile = () => {
    setView('dashboard');
    fetchDriverData();
  };

  const handleTripUpdate = () => {
    fetchDriverData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (view === 'complete') {
    return <CompleteProfile onBack={() => setView('dashboard')} onComplete={handleCompleteProfile} />;
  }

  if (view === 'profile') {
    return <DriverProfile onBack={() => setView('dashboard')} onEdit={() => setView('complete')} />;
  }

  if (view === 'earnings' && driver) {
    return <Earnings driverId={driver.id} onBack={() => setView('dashboard')} />;
  }

  if (view === 'support') {
    return <Support onBack={() => setView('dashboard')} />;
  }

  const profileComplete = driver?.vehicle_plate && driver?.driver_license_number;

  const getStatusInfo = () => {
    if (!driver) return { text: 'Cargando...', color: 'gray', icon: Clock };

    if (driver.status === 'ACTIVE') {
      return { text: 'Activo y disponible', color: 'green', icon: CheckCircle };
    } else if (driver.status === 'PENDING_APPROVAL') {
      return { text: 'Pendiente de aprobación', color: 'yellow', icon: Clock };
    } else if (driver.status === 'SUSPENDED') {
      return { text: 'Cuenta suspendida', color: 'red', icon: XCircle };
    } else if (driver.status === 'REJECTED') {
      return { text: 'Solicitud rechazada', color: 'red', icon: XCircle };
    }
    return { text: 'Inactivo', color: 'gray', icon: Clock };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">VIVO Conductor</h1>
          <div className="flex items-center gap-4">
            <NotificationCenter
              userId={profile?.id || ''}
              onNavigate={(link) => {
                if (link === '/support') setView('support');
              }}
            />
            <button
              onClick={() => setView('support')}
              className="relative flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="hidden sm:inline">Soporte</span>
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </button>
            <button
              onClick={() => setView('profile')}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="hidden sm:inline">{profile?.full_name}</span>
            </button>
            <Button variant="outline" size="sm" onClick={signOut}>
              Salir
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!profileComplete && (
          <Card className="mb-6 bg-yellow-50 border-2 border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2">Completá tu perfil de conductor</h3>
                <p className="text-yellow-800 mb-4">
                  Para comenzar a recibir viajes, necesitás completar tu información de conductor, subir documentos y vincular tu cuenta de Mercado Pago.
                </p>
                <Button variant="primary" size="sm" onClick={() => setView('complete')}>
                  Completar perfil
                </Button>
              </div>
            </div>
          </Card>
        )}

        {profileComplete && !driver?.can_receive_trips && (
          <Card className="mb-6 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Perfil en revisión</h3>
                <p className="text-blue-800 mb-2">
                  Tu perfil está completo. Estamos revisando tus documentos.
                </p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  {!driver?.documents_validated && <li>Validación de documentos pendiente</li>}
                  {driver?.mp_status !== 'LINKED' && <li>Vinculación de Mercado Pago pendiente</li>}
                  {driver && driver.score < 60 && <li>Score insuficiente (mínimo 60)</li>}
                </ul>
              </div>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setView('earnings')}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold">Ganancias</h2>
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">${weeklyEarnings}</p>
            <p className="text-sm text-gray-600">Esta semana</p>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-2">
              <Car className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Viajes</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{driver?.total_trips || 0}</p>
            <p className="text-sm text-gray-600">Totales</p>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-semibold">Calificación</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {driver?.average_rating ? driver.average_rating.toFixed(1) : '5.0'}
            </p>
            <p className="text-sm text-gray-600">
              {driver?.total_ratings ? `${driver.total_ratings} calificaciones` : 'Sin calificaciones'}
            </p>
          </Card>
        </div>

        {driver && profileComplete && driver.can_receive_trips && (
          <div className="mt-6">
            <AvailabilityToggle driver={driver} onUpdate={fetchDriverData} />
          </div>
        )}

        {driver?.is_on_trip && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Viaje Activo</h2>
            <ActiveTrip driverId={driver.id} onComplete={handleTripUpdate} />
          </div>
        )}

        {driver && !driver.is_on_trip && driver.can_receive_trips && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Solicitudes de Viaje</h2>
            <TripRequests
              driverId={driver.id}
              isOnline={driver.is_online}
              onAccept={handleTripUpdate}
            />
          </div>
        )}

        <Card className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Estado actual</h2>
          <div className={`bg-${statusInfo.color}-100 rounded-lg p-4 flex items-center gap-3`}>
            <StatusIcon className={`w-6 h-6 text-${statusInfo.color}-600`} />
            <div className="flex-1">
              <p className={`font-medium text-${statusInfo.color}-900`}>{statusInfo.text}</p>
              {driver?.can_receive_trips && (
                <p className={`text-sm text-${statusInfo.color}-700 mt-1`}>
                  {driver.is_online
                    ? 'Estás en línea y podés recibir solicitudes'
                    : 'Activá tu disponibilidad para recibir solicitudes'}
                </p>
              )}
            </div>
          </div>

          {profileComplete && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Score</p>
                  <p className="font-semibold text-gray-900">{driver?.score.toFixed(2) || '100.00'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Estado de documentos</p>
                  <p className="font-semibold text-gray-900">
                    {driver?.documents_validated ? 'Validados ✓' : 'Pendiente de validación'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Mercado Pago</p>
                  <p className="font-semibold text-gray-900">
                    {driver?.mp_status === 'LINKED' ? 'Vinculado ✓' : 'Pendiente'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Vehículo</p>
                  <p className="font-semibold text-gray-900">
                    {driver?.vehicle_plate ? driver.vehicle_plate.toUpperCase() : 'No registrado'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
