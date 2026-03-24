import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, AlertCircle, Clock, User as UserIcon } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    subscribeToMessages();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

          setMessages((prev) => [...prev, newMsg]);

          if (payload.new.sender_id !== currentUserId) {
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

    setSending(true);

    try {
      const { error } = await supabase
        .from('support_conversation_messages')
        .insert([
          {
            conversation_id: conversationId,
            sender_id: currentUserId,
            sender_type: currentUserType,
            message: newMessage.trim(),
            message_type: 'TEXT',
            is_internal_note: false,
          },
        ]);

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar el mensaje');
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

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Chat de Soporte</h3>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              En línea
            </p>
          </div>
        </div>

        {canEscalate && onEscalate && (
          <Button
            variant="secondary"
            onClick={onEscalate}
            className="text-xs"
          >
            <AlertCircle className="w-4 h-4 mr-1" />
            Escalar a Departamento
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {Object.entries(messageGroups).map(([dateKey, msgs]) => (
          <div key={dateKey}>
            <div className="flex items-center justify-center my-4">
              <div className="px-3 py-1 bg-gray-200 rounded-full text-xs text-gray-600">
                {formatDate(msgs[0].created_at)}
              </div>
            </div>

            {msgs.map((msg) => {
              const isOwnMessage = msg.sender_id === currentUserId;
              const isSystemMessage = msg.sender_type === 'SYSTEM';

              if (isSystemMessage) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {msg.message}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}
                >
                  <div className={`max-w-[70%] ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                    {!isOwnMessage && (
                      <p className="text-xs text-gray-500 mb-1 ml-1">{msg.sender_name}</p>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      <div
                        className={`flex items-center gap-1 mt-1 text-xs ${
                          isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(msg.created_at)}</span>
                        {isOwnMessage && msg.read_at && (
                          <span className="ml-1">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {agentTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribí tu mensaje..."
            className="flex-1"
            disabled={sending}
          />

          <Button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Presioná Enter para enviar el mensaje
        </p>
      </form>
    </div>
  );
}
