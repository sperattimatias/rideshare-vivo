import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, AlertCircle, Clock, User as UserIcon, CheckCheck, Headphones, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './Button';
import { Input } from './Input';

interface Message {
  id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  message_type: string;
  is_internal_note: boolean;
  read_at: string | null;
  created_at: string;
  sender_name?: string;
}

interface AgentInfo {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

interface ChatBoxProps {
  conversationId: string;
  currentUserId: string;
  currentUserType: 'PASSENGER' | 'DRIVER' | 'ADMIN';
  onEscalate?: () => void;
  canEscalate?: boolean;
}

export function ChatBox({
  conversationId,
  currentUserId,
  currentUserType,
  onEscalate,
  canEscalate = false,
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchConversationInfo();
    fetchMessages();
    subscribeToMessages();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (showNotification) {
      playNotificationSound();
      const timer = setTimeout(() => setShowNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  const fetchConversationInfo = async () => {
    try {
      const { data: conversation } = await supabase
        .from('support_conversations')
        .select(`
          assigned_agent_id,
          user_profiles!support_conversations_assigned_agent_id_fkey (
            id,
            full_name,
            role
          )
        `)
        .eq('id', conversationId)
        .single();

      if (conversation?.user_profiles) {
        setAgent({
          id: conversation.user_profiles.id,
          full_name: conversation.user_profiles.full_name,
          role: conversation.user_profiles.role || 'Agente de Soporte',
        });
      }
    } catch (error) {
      console.error('Error fetching conversation info:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('support_conversation_messages')
        .select(`
          *,
          user_profiles!support_conversation_messages_sender_id_fkey (
            full_name
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messagesWithNames = (data || []).map((msg: any) => ({
        ...msg,
        sender_name: msg.user_profiles?.full_name || 'Usuario',
      }));

      setMessages(messagesWithNames);
      markMessagesAsRead();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const playNotificationSound = () => {
    const beep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiqO0/HQgyMGHm7A7+OZURE');
    beep.volume = 0.3;
    beep.play().catch(() => {});
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_conversation_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: any) => {
          const { data: userData } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new,
            sender_name: userData?.full_name || 'Usuario',
          };

          setMessages((prev) => {
            const exists = prev.some(msg => msg.id === newMsg.id);
            if (exists) {
              return prev;
            }
            return [...prev, newMsg];
          });

          if (payload.new.sender_id !== currentUserId) {
            setShowNotification(true);
            setHasUnreadMessages(true);
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from('support_conversation_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage: Message = {
      id: tempId,
      sender_id: currentUserId,
      sender_type: currentUserType,
      message: messageText,
      message_type: 'TEXT',
      is_internal_note: false,
      read_at: null,
      created_at: new Date().toISOString(),
      sender_name: 'Tú',
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    setSending(true);

    try {
      const { data, error } = await supabase
        .from('support_conversation_messages')
        .insert([
          {
            conversation_id: conversationId,
            sender_id: currentUserId,
            sender_type: currentUserType,
            message: messageText,
            message_type: 'TEXT',
            is_internal_note: false,
          },
        ])
        .select(`
          *,
          user_profiles!support_conversation_messages_sender_id_fkey (
            full_name
          )
        `)
        .single();

      if (error) throw error;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                ...data,
                sender_name: data.user_profiles?.full_name || 'Usuario'
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);

      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setNewMessage(messageText);

      alert('Error al enviar el mensaje. Por favor intentá de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    }
  };

  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach((msg) => {
      const dateKey = new Date(msg.created_at).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate();

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-red-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {showNotification && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="font-medium">Nuevo mensaje recibido</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
        <div className="flex items-center gap-3">
          <div className="relative">
            {agent ? (
              <div className={`w-12 h-12 ${getAvatarColor(agent.full_name)} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                {getInitials(agent.full_name)}
              </div>
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center shadow-md">
                <Headphones className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">
              {agent ? agent.full_name : 'Equipo de Soporte'}
            </h3>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                En línea
              </span>
              {agent && (
                <>
                  <span className="text-gray-400">•</span>
                  <span>{agent.role}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {canEscalate && onEscalate && (
          <Button
            variant="secondary"
            onClick={onEscalate}
            size="sm"
          >
            <AlertCircle className="w-4 h-4 mr-1" />
            Escalar
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center mb-4">
              <Headphones className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Bienvenido al chat de soporte
            </h3>
            <p className="text-gray-600 max-w-md">
              Estamos aquí para ayudarte. Enviá tu mensaje y te responderemos lo antes posible.
            </p>
          </div>
        )}

        {Object.entries(messageGroups).map(([dateKey, msgs]) => (
          <div key={dateKey}>
            <div className="flex items-center justify-center my-6">
              <div className="px-4 py-1.5 bg-white shadow-sm rounded-full text-xs font-medium text-gray-700 border border-gray-200">
                {formatDate(msgs[0].created_at)}
              </div>
            </div>

            {msgs.map((msg) => {
              const isOwnMessage = msg.sender_id === currentUserId;
              const isSystemMessage = msg.sender_type === 'SYSTEM';

              if (isSystemMessage) {
                return (
                  <div key={msg.id} className="flex justify-center my-3">
                    <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-green-50 text-blue-800 rounded-full text-xs flex items-center gap-2 shadow-sm border border-blue-100">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">{msg.message}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 group`}
                >
                  <div className={`flex gap-2 max-w-[75%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isOwnMessage && (
                      <div className={`w-8 h-8 ${getAvatarColor(msg.sender_name || 'A')} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md`}>
                        {getInitials(msg.sender_name || 'AG')}
                      </div>
                    )}
                    <div>
                      {!isOwnMessage && (
                        <p className="text-xs font-medium text-gray-600 mb-1 ml-1">{msg.sender_name}</p>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-md transition-all group-hover:shadow-lg ${
                          isOwnMessage
                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm'
                            : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                        <div
                          className={`flex items-center gap-1.5 mt-2 text-xs ${
                            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(msg.created_at)}</span>
                          {isOwnMessage && (
                            <CheckCheck className={`w-4 h-4 ml-1 ${msg.read_at ? 'text-green-300' : 'text-blue-200'}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {agentTyping && (
          <div className="flex justify-start mb-4">
            <div className="flex gap-2">
              <div className={`w-8 h-8 ${agent ? getAvatarColor(agent.full_name) : 'bg-blue-500'} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md`}>
                {agent ? getInitials(agent.full_name) : 'AG'}
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-5 py-3 shadow-md">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-3">
          <button
            type="button"
            className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Adjuntar archivo"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Escribí tu mensaje..."
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '120px',
                height: 'auto',
              }}
              disabled={sending}
            />
          </div>

          <Button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
          <span>💡 Tip: Presioná Enter para enviar, Shift + Enter para nueva línea</span>
        </p>
      </form>
    </div>
  );
}
