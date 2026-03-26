import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { isUserAdmin } from './services/admin/adminService';
import { getDriverIdByUserId } from './services/drivers/driverService';
import { canAccessPath, getRoleHomePath } from './lib/routing/routeGuards';

import { Login } from './pages/auth/Login';
import { SignUp } from './pages/auth/SignUp';
import { RequestRide } from './pages/passenger/RequestRide';
import { ActiveRide } from './pages/passenger/ActiveRide';
import { RideHistory } from './pages/passenger/RideHistory';
import { RateTrip } from './pages/passenger/RateTrip';
import { PayTrip } from './pages/passenger/PayTrip';
import { Support as PassengerSupport } from './pages/passenger/Support';
import { DriverProfile } from './pages/driver/DriverProfile';
import { CompleteProfile } from './pages/driver/CompleteProfile';
import { Earnings } from './pages/driver/Earnings';
import { Support as DriverSupport } from './pages/driver/Support';
import OperationalDashboard from './pages/admin/OperationalDashboard';
import IncidentManagement from './pages/admin/IncidentManagement';
import AuditLogs from './pages/admin/AuditLogs';
import IntelligenceCenter from './pages/admin/IntelligenceCenter';
import DemandRadar from './pages/admin/DemandRadar';
import { ServiceZones } from './pages/admin/ServiceZones';
import DriverVerificationEnhanced from './pages/admin/DriverVerificationEnhanced';
import { PlatformAnalytics } from './pages/admin/PlatformAnalytics';
import { TripMonitoring } from './pages/admin/TripMonitoring';
import { UserManagement } from './pages/admin/UserManagement';
import { SystemConfiguration } from './pages/admin/SystemConfiguration';
import { SupportDashboard } from './pages/admin/SupportDashboard';

const Welcome = lazy(() => import('./pages/Welcome').then((m) => ({ default: m.Welcome })));
const PassengerDashboard = lazy(() =>
  import('./pages/PassengerDashboard').then((m) => ({ default: m.PassengerDashboard })),
);
const DriverDashboard = lazy(() =>
  import('./pages/DriverDashboard').then((m) => ({ default: m.DriverDashboard })),
);
const AdminDashboard = lazy(() =>
  import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
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

function normalizePath(path: string): string {
  if (!path || path === '') return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function matchPath(pattern: string, path: string): Record<string, string> | null {
  const patternSegments = normalizePath(pattern).split('/').filter(Boolean);
  const pathSegments = normalizePath(path).split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i += 1) {
    const patternSegment = patternSegments[i];
    const pathSegment = pathSegments[i];

    if (patternSegment.startsWith(':')) {
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
      continue;
    }

    if (patternSegment !== pathSegment) {
      return null;
    }
  }

  return params;
}

function AppContent() {
  const { loading, profile, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [path, setPath] = useState(normalizePath(window.location.pathname));

  const navigate = (to: string, replace = false) => {
    const nextPath = normalizePath(to);

    if (replace) {
      window.history.replaceState({}, '', nextPath);
    } else {
      window.history.pushState({}, '', nextPath);
    }

    setPath(nextPath);
  };

  useEffect(() => {
    const onPopState = () => {
      setPath(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!user || !profile) {
      setIsAdmin(false);
      setCheckingAdmin(false);
      return;
    }

    const checkAdminStatus = async () => {
      try {
        const admin = await isUserAdmin(user.id);
        setIsAdmin(admin);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, profile]);

  useEffect(() => {
    if (!profile || profile.user_type !== 'DRIVER') {
      setDriverId(null);
      return;
    }

    const fetchDriverId = async () => {
      const id = await getDriverIdByUserId(profile.id);
      setDriverId(id);
    };

    fetchDriverId();
  }, [profile]);

  const roleHomePath = useMemo(() => {
    if (!profile) return '/';
    return getRoleHomePath({ userType: profile.user_type, isAdminRecord: isAdmin });
  }, [isAdmin, profile]);

  if (loading || checkingAdmin) {
    return <LoadingScreen />;
  }

  const requiresAuth =
    path.startsWith('/passenger') || path.startsWith('/driver') || path.startsWith('/admin');

  if (requiresAuth && !profile) {
    navigate('/auth/login', true);
    return <LoadingScreen />;
  }

  if (profile) {
    if (path === '/' || path === '/auth/login' || path.startsWith('/auth/signup')) {
      navigate(roleHomePath, true);
      return <LoadingScreen />;
    }
  }

  if (!profile) {
    if (path === '/auth/login') {
      return <Login onBack={() => navigate('/')} />;
    }

    const signupPassenger = matchPath('/auth/signup/passenger', path);
    if (signupPassenger) {
      return <SignUp userType="PASSENGER" onBack={() => navigate('/')} />;
    }

    const signupDriver = matchPath('/auth/signup/driver', path);
    if (signupDriver) {
      return <SignUp userType="DRIVER" onBack={() => navigate('/')} />;
    }

    return (
      <Suspense fallback={<LoadingScreen />}>
        <Welcome />
      </Suspense>
    );
  }

  const isPassenger = profile.user_type === 'PASSENGER';
  const isDriver = profile.user_type === 'DRIVER';
  const canAccessAdmin = isAdmin || profile.user_type === 'ADMIN';

  if (!canAccessPath(path, { userType: profile.user_type, isAdminRecord: isAdmin })) {
    navigate(roleHomePath, true);
    return <LoadingScreen />;
  }

  if (isPassenger) {
    const activeRideMatch = matchPath('/passenger/active/:tripId', path);
    if (activeRideMatch?.tripId) {
      return (
        <ActiveRide
          tripId={activeRideMatch.tripId}
          onBack={() => navigate('/passenger')}
          onPayTrip={(tripId) => navigate(`/passenger/pay/${tripId}`)}
        />
      );
    }

    const payMatch = matchPath('/passenger/pay/:tripId', path);
    if (payMatch?.tripId) {
      return (
        <PayTrip
          tripId={payMatch.tripId}
          onBack={() => navigate('/passenger')}
          onPaymentComplete={() => navigate('/passenger/history', true)}
        />
      );
    }

    const rateMatch = matchPath('/passenger/rate/:tripId', path);
    if (rateMatch?.tripId) {
      return (
        <RateTrip
          tripId={rateMatch.tripId}
          onBack={() => navigate('/passenger/history')}
          onComplete={() => navigate('/passenger/history', true)}
        />
      );
    }

    if (path === '/passenger/request') {
      return <RequestRide onBack={() => navigate('/passenger')} onSuccess={() => navigate('/passenger', true)} />;
    }

    if (path === '/passenger/history') {
      return (
        <RideHistory
          onBack={() => navigate('/passenger')}
          onRateTrip={(tripId) => navigate(`/passenger/rate/${tripId}`)}
          onViewTrip={(tripId) => navigate(`/passenger/active/${tripId}`)}
        />
      );
    }

    if (path === '/passenger/support') {
      return <PassengerSupport onBack={() => navigate('/passenger')} />;
    }

    return (
      <Suspense fallback={<LoadingScreen />}>
        <PassengerDashboard />
      </Suspense>
    );
  }

  if (isDriver) {
    if (path === '/driver/profile') {
      return (
        <DriverProfile
          onBack={() => navigate('/driver')}
          onEdit={() => navigate('/driver/complete-profile')}
        />
      );
    }

    if (path === '/driver/complete-profile') {
      return (
        <CompleteProfile
          onBack={() => navigate('/driver')}
          onComplete={() => navigate('/driver', true)}
        />
      );
    }

    if (path === '/driver/earnings' && driverId) {
      return <Earnings driverId={driverId} onBack={() => navigate('/driver')} />;
    }

    if (path === '/driver/support') {
      return <DriverSupport onBack={() => navigate('/driver')} />;
    }

    return (
      <Suspense fallback={<LoadingScreen />}>
        <DriverDashboard />
      </Suspense>
    );
  }

  if (canAccessAdmin) {
    if (path === '/admin/operations') return <OperationalDashboard onBack={() => navigate('/admin')} />;
    if (path === '/admin/incidents') return <IncidentManagement onBack={() => navigate('/admin')} />;
    if (path === '/admin/audit-logs') return <AuditLogs onBack={() => navigate('/admin')} />;
    if (path === '/admin/intelligence') return <IntelligenceCenter onBack={() => navigate('/admin')} />;
    if (path === '/admin/demand-radar') return <DemandRadar onBack={() => navigate('/admin')} />;
    if (path === '/admin/service-zones') return <ServiceZones onBack={() => navigate('/admin')} />;
    if (path === '/admin/support') return <SupportDashboard />;
    if (path === '/admin/driver-verification') return <DriverVerificationEnhanced onBack={() => navigate('/admin')} />;
    if (path === '/admin/analytics') return <PlatformAnalytics onBack={() => navigate('/admin')} />;
    if (path === '/admin/trip-monitoring') return <TripMonitoring onBack={() => navigate('/admin')} />;
    if (path === '/admin/user-management') return <UserManagement onBack={() => navigate('/admin')} />;
    if (path === '/admin/configuration') return <SystemConfiguration onBack={() => navigate('/admin')} />;

    return (
      <Suspense fallback={<LoadingScreen />}>
        <AdminDashboard />
      </Suspense>
    );
  }

  return <LoadingScreen />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
