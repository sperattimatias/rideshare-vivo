import { useState } from 'react';
import { Car, CircleUser as UserCircle, Shield } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Login } from './auth/Login';
import { SignUp } from './auth/SignUp';

export function Welcome() {
  const [authMode, setAuthMode] = useState<'welcome' | 'login' | 'signup'>('welcome');
  const [selectedUserType, setSelectedUserType] = useState<'PASSENGER' | 'DRIVER' | 'ADMIN' | null>(null);

  if (authMode === 'login') {
    return <Login onBack={() => setAuthMode('welcome')} />;
  }

  if (authMode === 'signup' && selectedUserType) {
    return (
      <SignUp
        userType={selectedUserType}
        onBack={() => {
          setAuthMode('welcome');
          setSelectedUserType(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Car className="w-16 h-16 text-blue-600" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-3">VIVO</h1>
          <p className="text-xl text-gray-600">Tu viaje, tu momento</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card
            hover
            onClick={() => {
              setSelectedUserType('PASSENGER');
              setAuthMode('signup');
            }}
            className="text-center"
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <UserCircle className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Pasajero</h3>
              <p className="text-gray-600 mb-4">Viajá cómodo y seguro a donde necesites</p>
              <Button variant="primary" fullWidth>
                Comenzar
              </Button>
            </div>
          </Card>

          <Card
            hover
            onClick={() => {
              setSelectedUserType('DRIVER');
              setAuthMode('signup');
            }}
            className="text-center"
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Car className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Conductor</h3>
              <p className="text-gray-600 mb-4">Generá ingresos conduciendo con VIVO</p>
              <Button variant="primary" fullWidth>
                Registrarse
              </Button>
            </div>
          </Card>

          <Card hover className="text-center opacity-50 cursor-not-allowed">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-12 h-12 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Administrador</h3>
              <p className="text-gray-600 mb-4">Acceso restringido al personal autorizado</p>
              <Button variant="secondary" fullWidth disabled>
                Solo invitación
              </Button>
            </div>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-3">¿Ya tenés cuenta?</p>
          <Button variant="outline" onClick={() => setAuthMode('login')}>
            Iniciar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
