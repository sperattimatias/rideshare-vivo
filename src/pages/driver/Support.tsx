import { useState, useEffect } from 'react';
import { MessageCircle, Plus, X, Star, Clock } from 'lucide-react';
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
  rateConversation,
  getPriorityColor,
  getStatusColor,
  getPriorityLabel,
  getStatusLabel,
  type SupportCategory,
  type SupportConversation,
} from '../../lib/supportSystem';

interface SupportProps {
  onBack: () => void;
}

const QUICK_QUESTIONS = [
  { text: '¿Cómo cobro mis ganancias?', category: 'payments' },
  { text: 'Problema con Mercado Pago', category: 'payments' },
  { text: 'No recibo solicitudes de viaje', category: 'technical' },
  { text: 'Consulta sobre documentación', category: 'driver_verification' },
  { text: 'Reportar un incidente', category: 'incidents' },
  { text: '¿Cómo funciona el score?', category: 'general' }
];

export function Support({ onBack }: SupportProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);

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
      const [convs, , cats] = await Promise.all([
        fetchUserConversations(user.id),
        fetchDepartments(),
        fetchCategories(),
      ]);

      setConversations(convs);
      setCategories(cats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (question: { text: string; category: string }) => {
    const category = categories.find((cat) => cat.slug === question.category);
    if (category) {
      setFormData({
        category_id: category.id,
        subject: question.text,
        description: question.text,
      });
      setShowNewConversation(true);
      setShowQuickQuestions(false);
    }
  };

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      const conversationId = await createConversation({
        userId: user.id,
        userType: 'DRIVER',
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

  const handleRateConversation = async (conversationId: string) => {
    if (ratingData.rating === 0) {
      alert('Por favor seleccioná una calificación');
      return;
    }

    try {
      await rateConversation(conversationId, ratingData.rating, ratingData.comment);
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
              <Button variant="outline" size="sm" onClick={onBack} className="mb-2">
                Volver al Dashboard
              </Button>
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
              currentUserType="DRIVER"
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
        <div className="mb-6">
          <Button variant="outline" size="sm" onClick={onBack} className="mb-4">
            Volver al Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Centro de Ayuda para Conductores</h1>
              <p className="text-gray-600 mt-1">Iniciá un chat o revisá tus consultas</p>
            </div>
            <Button onClick={() => setShowNewConversation(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Nueva Consulta
            </Button>
          </div>
        </div>

        {showQuickQuestions && conversations.length === 0 && !showNewConversation && (
          <Card className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-green-50">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Preguntas Frecuentes</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {QUICK_QUESTIONS.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(question)}
                  className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-gray-900">{question.text}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

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

        {conversations.length === 0 ? (
          <Card className="p-12 text-center bg-gradient-to-br from-blue-50 to-green-50">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <MessageCircle className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              No tenés consultas todavía
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Iniciá una nueva consulta para hablar con nuestro equipo de soporte. Estamos aquí para ayudarte.
            </p>
            <Button onClick={() => setShowNewConversation(true)} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Nueva Consulta
            </Button>
          </Card>
        ) : (
          <>
            {['OPEN', 'IN_PROGRESS', 'WAITING_RESPONSE'].map(status => {
              const statusConvs = conversations.filter(c => c.status === status);
              if (statusConvs.length === 0) return null;

              return (
                <div key={status} className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold text-gray-900">{getStatusLabel(status)}</h2>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                      {statusConvs.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {statusConvs.map((conv) => {
                      const category = categories.find(c => c.id === conv.category_id);

                      return (
                        <Card
                          key={conv.id}
                          className="p-6 hover:shadow-xl transition-all cursor-pointer border-l-4 border-blue-500 hover:border-green-500"
                          onClick={() => setActiveConversation(conv.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center shadow-md">
                                  <MessageCircle className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-bold text-gray-900 text-lg">{conv.subject}</h3>
                                  {category && (
                                    <p className="text-xs text-gray-500 mt-0.5">{category.name}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(conv.status)}`}>
                                    {getStatusLabel(conv.status)}
                                  </span>
                                  {conv.priority !== 'NORMAL' && (
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getPriorityColor(conv.priority)}`}>
                                      {getPriorityLabel(conv.priority)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-sm text-gray-700 mb-3 line-clamp-2">{conv.description}</p>

                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="font-mono bg-gray-100 px-2 py-1 rounded">{conv.conversation_number}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(conv.created_at).toLocaleDateString('es-AR', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {conv.channel === 'CHAT' && (
                                  <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                    <MessageCircle className="w-3 h-3" />
                                    Chat en vivo
                                  </span>
                                )}
                              </div>
                            </div>

                            <Button variant="secondary" size="sm" className="shadow-md">
                              Abrir Chat
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {conversations.some(c => ['RESOLVED', 'CLOSED'].includes(c.status)) && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-gray-600">Consultas Anteriores</h2>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold">
                    {conversations.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {conversations
                    .filter(c => ['RESOLVED', 'CLOSED'].includes(c.status))
                    .map((conv) => {
                      const category = categories.find(c => c.id === conv.category_id);

                      return (
                        <Card
                          key={conv.id}
                          className="p-5 hover:shadow-lg transition-all cursor-pointer bg-gray-50 border border-gray-200"
                          onClick={() => setActiveConversation(conv.id)}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                <MessageCircle className="w-4 h-4 text-gray-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm truncate">{conv.subject}</h3>
                                {category && (
                                  <p className="text-xs text-gray-500">{category.name}</p>
                                )}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(conv.status)} whitespace-nowrap`}>
                              {getStatusLabel(conv.status)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                            <span>{new Date(conv.created_at).toLocaleDateString('es-AR')}</span>
                          </div>

                          {conv.rating && (
                            <div className="flex items-center gap-1">
                              {[...Array(conv.rating)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              ))}
                              <span className="text-xs text-gray-600 ml-1">({conv.rating}/5)</span>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
