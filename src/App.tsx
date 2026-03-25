import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';

const Welcome = lazy(() => import('./pages/Welcome').then((m) => ({ default: m.Welcome })));
const PassengerDashboard = lazy(() =>
  import('./pages/PassengerDashboard').then((m) => ({ default: m.PassengerDashboard }))
);
const DriverDashboard = lazy(() =>
  import('./pages/DriverDashboard').then((m) => ({ default: m.DriverDashboard }))
);
const AdminDashboard = lazy(() =>
  import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { loading, profile, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    if (user && profile) {
      checkAdminStatus();
    } else {
      setCheckingAdmin(false);
    }
  }, [user, profile]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setCheckingAdmin(false);
    }
  };

  if (loading || checkingAdmin) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Welcome />
      </Suspense>
    );
  }

  if (isAdmin) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AdminDashboard />
      </Suspense>
    );
  }

  if (profile.user_type === 'PASSENGER') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <PassengerDashboard />
      </Suspense>
    );
  }

  if (profile.user_type === 'DRIVER') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <DriverDashboard />
      </Suspense>
    );
  }

  if (profile.user_type === 'ADMIN') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AdminDashboard />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-600">Tipo de usuario no reconocido</p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
