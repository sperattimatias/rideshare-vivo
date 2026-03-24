import { useState, FormEvent } from 'react';
import { ArrowLeft, Car, CircleUser as UserCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { STRINGS } from '../../lib/strings';
import { useAuth } from '../../contexts/AuthContext';

interface SignUpProps {
  userType: 'PASSENGER' | 'DRIVER' | 'ADMIN';
  onBack: () => void;
}

export function SignUp({ userType, onBack }: SignUpProps) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const userTypeLabels = {
    PASSENGER: 'Pasajero',
    DRIVER: 'Conductor',
    ADMIN: 'Administrador',
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, fullName, userType);

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </button>

        <Card>
          <div className="flex items-center justify-center mb-4">
            {userType === 'PASSENGER' ? (
              <UserCircle className="w-12 h-12 text-blue-600" />
            ) : (
              <Car className="w-12 h-12 text-green-600" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Registro de {userTypeLabels[userType]}
          </h2>
          <p className="text-gray-600 text-center mb-6">Creá tu cuenta en VIVO</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Input
              label="Nombre completo"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
              required
              fullWidth
            />

            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              fullWidth
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              fullWidth
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetí tu contraseña"
              required
              fullWidth
            />

            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Al registrarte, aceptás los términos y condiciones de VIVO
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
