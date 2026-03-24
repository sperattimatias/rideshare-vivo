import { useState, useEffect } from 'react';
import { MessageCircle, Plus, X, Star } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Textarea } from '../../components/Textarea';
import { ChatBox } from '../../components/ChatBox';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchDepartments,
  fetchCategories,
  createConversation,
  fetchUserConversations,
  escalateConversation,
  rateConversation,
  getPriorityColor,
  getStatusColor,
  getPriorityLabel,
  getStatusLabel,
  type SupportDepartment,
  type SupportCategory,
  type SupportConversation,
} from '../../lib/supportSystem';

export function Support() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [departments, setDepartments] = useState<SupportDepartment[]>([]);
  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [showRating, setShowRating] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    category_id: '',
    subject: '',
    description: '',
  });

  const [ratingData, setRatingData] = useState({
    rating: 0,
    comment: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [convs, depts, cats] = await Promise.all([
        fetchUserConversations(user.id),
        fetchDepartments(),
        fetchCategories(),
      ]);

      setConversations(convs);
      setDepartments(depts);
      setCategories(cats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      const conversationId = await createConversation({
        userId: user.id,
        userType: 'PASSENGER',
        categoryId: formData.category_id,
        subject: formData.subject,
        description: formData.description,
        channel: 'CHAT',
      });

      setFormData({ category_id: '', subject: '', description: '' });
      setShowNewConversation(false);
      setActiveConversation(conversationId);
      await loadData();
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Error al crear la conversación');
    }
  };

  const handleEscalate = async (conversationId: string) => {
    if (!user) return;

    const departmentId = prompt('Seleccioná el ID del departamento al que querés escalar:');
    if (!departmentId) return;

    const reason = prompt('Motivo del escalamiento:');
    if (!reason) return;

    try {
      await escalateConversation(conversationId, departmentId, reason, user.id);
      await loadData();
      alert('Conversación escalada exitosamente');
    } catch (error) {
      console.error('Error escalating conversation:', error);
      alert('Error al escalar la conversación');
    }
  };

  const handleRateConversation = async (conversationId: string) => {
    if (ratingData.rating === 0) {
      alert('Por favor seleccioná una calificación');
      return;
    }

    try {
      await rateConversation(conversationId, ratingData.rating, ratingData.comment);
      setShowRating(null);
      setRatingData({ rating: 0, comment: '' });
      await loadData();
      alert('Gracias por tu calificación');
    } catch (error) {
      console.error('Error rating conversation:', error);
      alert('Error al calificar');
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
              <p className="text-sm text-gray-600">
                {conversation?.conversation_number} - {getStatusLabel(conversation?.status || '')}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setActiveConversation(null)}>
              <X className="w-5 h-5" />
              Cerrar Chat
            </Button>
          </div>

          <div className="h-[600px]">
            <ChatBox
              conversationId={activeConversation}
              currentUserId={user?.id || ''}
              currentUserType="PASSENGER"
              canEscalate={conversation?.channel === 'CHAT'}
              onEscalate={() => handleEscalate(activeConversation)}
            />
          </div>

          {conversation?.status === 'RESOLVED' && !conversation.rating && (
            <Card className="mt-4 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Calificar Atención</h3>
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRatingData({ ...ratingData, rating: star })}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= ratingData.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                value={ratingData.comment}
                onChange={(e) => setRatingData({ ...ratingData, comment: e.target.value })}
                placeholder="Comentario opcional..."
                rows={3}
              />
              <Button onClick={() => handleRateConversation(activeConversation)} className="mt-4">
                Enviar Calificación
              </Button>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Centro de Ayuda</h1>
            <p className="text-gray-600 mt-1">Iniciá un chat o revisá tus consultas</p>
          </div>
          <Button onClick={() => setShowNewConversation(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Nueva Consulta
          </Button>
        </div>

        {showNewConversation && (
          <Card className="mb-6 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Nueva Consulta</h2>
              <button
                onClick={() => setShowNewConversation(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateConversation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} - {cat.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asunto <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Resumí tu consulta en pocas palabras"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Contanos más sobre tu consulta..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Iniciar Chat
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowNewConversation(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4">
          {conversations.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tenés consultas todavía
              </h3>
              <p className="text-gray-600 mb-4">
                Iniciá una nueva consulta para hablar con nuestro equipo de soporte
              </p>
              <Button onClick={() => setShowNewConversation(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Nueva Consulta
              </Button>
            </Card>
          ) : (
            conversations.map((conv) => (
              <Card
                key={conv.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setActiveConversation(conv.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{conv.subject}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(conv.status)}`}>
                        {getStatusLabel(conv.status)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(conv.priority)}`}>
                        {getPriorityLabel(conv.priority)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{conv.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{conv.conversation_number}</span>
                      <span>{new Date(conv.created_at).toLocaleDateString('es-AR')}</span>
                      {conv.channel === 'CHAT' && (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          Chat en vivo
                        </span>
                      )}
                    </div>
                    {conv.rating && (
                      <div className="flex items-center gap-1 mt-2">
                        {[...Array(conv.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    )}
                  </div>
                  <Button variant="secondary" size="sm">
                    Abrir
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
