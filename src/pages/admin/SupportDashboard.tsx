import { useState, useEffect } from 'react';
import { MessageCircle, Clock, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { Card } from '../../components/Card';
import { AdminLoadingState, AdminEmptyState } from '../../components/admin/AdminStates';
import { Button } from '../../components/Button';
import { ChatBox } from '../../components/ChatBox';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  assignConversation,
  resolveConversation,
  getPriorityColor,
  getStatusColor,
  getPriorityLabel,
  getStatusLabel,
  type SupportConversation,
} from '../../lib/supportSystem';

export function SupportDashboard() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    open: 0,
    in_progress: 0,
    resolved_today: 0,
    avg_response_time: 0,
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setConversations(data || []);

      const open = data?.filter((c) => c.status === 'OPEN').length || 0;
      const in_progress = data?.filter((c) => c.status === 'IN_PROGRESS').length || 0;
      const resolved_today =
        data?.filter(
          (c) =>
            c.resolved_at &&
            new Date(c.resolved_at).toDateString() === new Date().toDateString()
        ).length || 0;

      setStats({ open, in_progress, resolved_today, avg_response_time: 15 });
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToMe = async (conversationId: string) => {
    if (!user) return;

    try {
      await assignConversation(conversationId, user.id, user.id);
      await loadData();
      setActiveConversation(conversationId);
    } catch (error) {
      console.error('Error assigning conversation:', error);
      alert('Error al asignar conversación');
    }
  };

  const handleResolve = async (conversationId: string) => {
    const notes = prompt('Notas de resolución:');
    if (!notes) return;

    try {
      await resolveConversation(conversationId, notes);
      await loadData();
      setActiveConversation(null);
      alert('Conversación resuelta');
    } catch (error) {
      console.error('Error resolving conversation:', error);
      alert('Error al resolver conversación');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (activeConversation) {
    const conversation = conversations.find((c) => c.id === activeConversation);

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{conversation?.subject}</h1>
              <p className="text-sm text-gray-600">{conversation?.conversation_number}</p>
            </div>
            <div className="flex gap-2">
              {conversation?.status !== 'RESOLVED' && (
                <Button onClick={() => handleResolve(activeConversation)}>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Resolver
                </Button>
              )}
              <Button variant="secondary" onClick={() => setActiveConversation(null)}>
                Volver
              </Button>
            </div>
          </div>

          <div className="h-[600px]">
            <ChatBox
              conversationId={activeConversation}
              currentUserId={user?.id || ''}
              currentUserType="ADMIN"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard de Soporte</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Abiertos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">En Progreso</p>
                <p className="text-2xl font-bold text-gray-900">{stats.in_progress}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Resueltos Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resolved_today}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tiempo Resp. Prom.</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avg_response_time}m</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Conversaciones Activas</h2>

          <div className="space-y-3">
            {conversations
              .filter((c) => c.status !== 'CLOSED')
              .map((conv) => (
                <div
                  key={conv.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{conv.subject}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                            conv.status
                          )}`}
                        >
                          {getStatusLabel(conv.status)}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(
                            conv.priority
                          )}`}
                        >
                          {getPriorityLabel(conv.priority)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{conv.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{conv.conversation_number}</span>
                        <span>
                          {conv.user_type === 'PASSENGER' ? 'Pasajero' : 'Conductor'}
                        </span>
                        <span>{new Date(conv.created_at).toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!conv.assigned_agent_id ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAssignToMe(conv.id)}
                        >
                          Asignarme
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setActiveConversation(conv.id)}
                        >
                          Ver Chat
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            {conversations.filter((c) => c.status !== 'CLOSED').length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No hay conversaciones activas</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
