import { useState, useEffect } from 'react';
import { ArrowLeft, User, Search, Mail, Phone, Calendar, Shield } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type PassengerRow = Database['public']['Tables']['passengers']['Row'];
type DriverRow = Database['public']['Tables']['drivers']['Row'];

interface UserWithDetails extends UserProfileRow {
  passenger?: PassengerRow;
  driver?: DriverRow;
}

interface UserManagementProps {
  onBack: () => void;
}

export function UserManagement({ onBack }: UserManagementProps) {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'passengers' | 'drivers'>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithDetails: UserWithDetails[] = [];

      for (const profile of profiles || []) {
        const userDetail: UserWithDetails = { ...profile };

        if (profile.user_type === 'PASSENGER' || filter === 'all') {
          const { data: passenger } = await supabase
            .from('passengers')
            .select('*')
            .eq('user_id', profile.user_id)
            .maybeSingle();

          if (passenger) {
            userDetail.passenger = passenger;
          }
        }

        if (profile.user_type === 'DRIVER' || filter === 'all') {
          const { data: driver } = await supabase
            .from('drivers')
            .select('*')
            .eq('user_id', profile.user_id)
            .maybeSingle();

          if (driver) {
            userDetail.driver = driver;
          }
        }

        if (filter === 'all' ||
            (filter === 'passengers' && userDetail.passenger) ||
            (filter === 'drivers' && userDetail.driver)) {
          usersWithDetails.push(userDetail);
        }
      }

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower)
    );
  });

  const getUserTypeBadge = (user: UserWithDetails) => {
    if (user.passenger && user.driver) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Pasajero + Conductor
        </span>
      );
    } else if (user.driver) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Conductor
        </span>
      );
    } else if (user.passenger) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Pasajero
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Usuario
        </span>
      );
    }
  };

  if (selectedUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => setSelectedUser(null)}
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
              <h1 className="text-3xl font-bold text-gray-900">Detalles del Usuario</h1>
              {getUserTypeBadge(selectedUser)}
            </div>
          </div>

          <Card className="mb-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Información Personal</h2>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                {selectedUser.profile_photo_url ? (
                  <img
                    src={selectedUser.profile_photo_url}
                    alt={selectedUser.full_name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-gray-500" />
                )}
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">{selectedUser.full_name}</p>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="font-medium text-gray-900">{selectedUser.phone || 'No registrado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha de registro</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedUser.created_at).toLocaleString('es-AR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo de usuario</p>
                <p className="font-medium text-gray-900">{selectedUser.user_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ID de usuario</p>
                <p className="font-medium text-gray-900 text-xs">{selectedUser.user_id}</p>
              </div>
            </div>
          </Card>

          {selectedUser.passenger && (
            <Card className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Información de Pasajero</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Método de pago preferido</p>
                  <p className="font-medium text-gray-900">
                    {selectedUser.passenger.preferred_payment_method || 'No especificado'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total de viajes</p>
                  <p className="font-medium text-gray-900">
                    {selectedUser.passenger.total_trips || 0}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {selectedUser.driver && (
            <Card className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Información de Conductor</h3>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Vehículo</p>
                  <p className="font-medium text-gray-900">
                    {selectedUser.driver.vehicle_brand} {selectedUser.driver.vehicle_model}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Patente</p>
                  <p className="font-medium text-gray-900 uppercase">
                    {selectedUser.driver.vehicle_plate}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estado de verificación</p>
                  <p className="font-medium text-gray-900">
                    {selectedUser.driver.verification_status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Calificación promedio</p>
                  <p className="font-medium text-gray-900">
                    {selectedUser.driver.average_rating.toFixed(1)} ⭐
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total de viajes</p>
                  <p className="font-medium text-gray-900">
                    {selectedUser.driver.total_trips || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Score</p>
                  <p className="font-medium text-gray-900">{selectedUser.driver.score}/100</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Mercado Pago</p>
                <p className="font-medium text-gray-900">
                  {selectedUser.driver.mp_seller_id ? (
                    <span className="text-green-600">✓ Cuenta vinculada</span>
                  ) : (
                    <span className="text-red-600">✗ No vinculada</span>
                  )}
                </p>
              </div>
            </Card>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administrar pasajeros y conductores de la plataforma</p>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todos
          </Button>
          <Button
            variant={filter === 'passengers' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('passengers')}
          >
            Pasajeros
          </Button>
          <Button
            variant={filter === 'drivers' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('drivers')}
          >
            Conductores
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando usuarios...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="text-center py-12">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No se encontraron usuarios</h2>
            <p className="text-gray-600">
              {searchTerm
                ? 'Intentá con otro término de búsqueda'
                : 'No hay usuarios registrados en el sistema'}
            </p>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 mb-6">
              {filteredUsers.map((user) => (
                <Card
                  key={user.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      {user.profile_photo_url ? (
                        <img
                          src={user.profile_photo_url}
                          alt={user.full_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-gray-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{user.full_name}</h3>
                        {getUserTypeBadge(user)}
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-900">{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-900">{user.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-900">
                            {new Date(user.created_at).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-center text-sm text-gray-600">
              Mostrando {filteredUsers.length} de {users.length} usuarios
            </div>
          </>
        )}
      </div>
    </div>
  );
}
