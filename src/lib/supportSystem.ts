import { supabase } from './supabase';

export interface SupportDepartment {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  avg_response_time_minutes: number;
}

export interface SupportCategory {
  id: string;
  name: string;
  slug: string | null;
  description: string;
  department_id: string | null;
  requires_urgent_attention: boolean;
  is_active: boolean;
}

export interface SupportConversation {
  id: string;
  conversation_number: string;
  user_id: string;
  user_type: 'PASSENGER' | 'DRIVER';
  category_id: string | null;
  department_id: string | null;
  assigned_agent_id: string | null;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_RESPONSE' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
  channel: 'CHAT' | 'TICKET';
  escalated_from_chat: boolean;
  chat_started_at: string;
  escalated_at: string | null;
  rating: number | null;
  rating_comment: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const getPriorityColor = (priority: string): string => {
  const colors: { [key: string]: string } = {
    LOW: 'bg-gray-100 text-gray-800',
    NORMAL: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
    CRITICAL: 'bg-purple-100 text-purple-800',
  };
  return colors[priority] || colors.NORMAL;
};

export const getStatusColor = (status: string): string => {
  const colors: { [key: string]: string } = {
    OPEN: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    WAITING_RESPONSE: 'bg-orange-100 text-orange-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || colors.OPEN;
};

export const getPriorityLabel = (priority: string): string => {
  const labels: { [key: string]: string } = {
    LOW: 'Baja',
    NORMAL: 'Normal',
    HIGH: 'Alta',
    URGENT: 'Urgente',
    CRITICAL: 'Crítica',
  };
  return labels[priority] || 'Normal';
};

export const getStatusLabel = (status: string): string => {
  const labels: { [key: string]: string } = {
    OPEN: 'Abierto',
    IN_PROGRESS: 'En Progreso',
    WAITING_RESPONSE: 'Esperando Respuesta',
    RESOLVED: 'Resuelto',
    CLOSED: 'Cerrado',
  };
  return labels[status] || 'Abierto';
};

export async function fetchDepartments(): Promise<SupportDepartment[]> {
  const { data, error } = await supabase
    .from('support_departments_new')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function fetchCategories(departmentId?: string): Promise<SupportCategory[]> {
  let query = supabase
    .from('support_categories_new')
    .select('*')
    .eq('is_active', true);

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data, error } = await query.order('name');

  if (error) throw error;
  return data || [];
}

export async function createConversation(params: {
  userId: string;
  userType: 'PASSENGER' | 'DRIVER';
  categoryId: string;
  subject: string;
  description: string;
  channel?: 'CHAT' | 'TICKET';
}): Promise<string> {
  const { data: category } = await supabase
    .from('support_categories_new')
    .select('department_id, requires_urgent_attention')
    .eq('id', params.categoryId)
    .single();

  const priority = category?.requires_urgent_attention ? 'URGENT' : 'NORMAL';

  const { data, error } = await supabase
    .from('support_conversations')
    .insert([
      {
        user_id: params.userId,
        user_type: params.userType,
        category_id: params.categoryId,
        department_id: category?.department_id,
        subject: params.subject,
        description: params.description,
        channel: params.channel || 'CHAT',
        priority,
        status: 'OPEN',
        conversation_number: '',
      },
    ])
    .select('id')
    .single();

  if (error) throw error;

  const systemMessage = `Conversación iniciada. Te responderemos pronto.`;
  await supabase.from('support_conversation_messages').insert([
    {
      conversation_id: data.id,
      sender_id: params.userId,
      sender_type: 'SYSTEM',
      message: systemMessage,
      message_type: 'SYSTEM_NOTIFICATION',
    },
  ]);

  return data.id;
}

export async function escalateConversation(
  conversationId: string,
  departmentId: string,
  reason: string,
  escalatedBy: string
): Promise<void> {
  const { data: conversation } = await supabase
    .from('support_conversations')
    .select('department_id, chat_started_at')
    .eq('id', conversationId)
    .single();

  await supabase
    .from('support_conversations')
    .update({
      department_id: departmentId,
      escalated_from_chat: true,
      escalated_at: new Date().toISOString(),
      channel: 'TICKET',
      priority: 'HIGH',
      status: 'WAITING_RESPONSE',
    })
    .eq('id', conversationId);

  await supabase.from('support_assignments').insert([
    {
      conversation_id: conversationId,
      from_department_id: conversation?.department_id,
      to_department_id: departmentId,
      reason,
      assigned_by: escalatedBy,
    },
  ]);

  const systemMessage = `Esta conversación fue escalada al departamento. Un agente te responderá pronto.`;
  await supabase.from('support_conversation_messages').insert([
    {
      conversation_id: conversationId,
      sender_id: escalatedBy,
      sender_type: 'SYSTEM',
      message: systemMessage,
      message_type: 'SYSTEM_NOTIFICATION',
    },
  ]);
}

export async function assignConversation(
  conversationId: string,
  agentId: string,
  assignedBy: string
): Promise<void> {
  await supabase
    .from('support_conversations')
    .update({
      assigned_agent_id: agentId,
      status: 'IN_PROGRESS',
    })
    .eq('id', conversationId);

  await supabase.from('support_assignments').insert([
    {
      conversation_id: conversationId,
      to_agent_id: agentId,
      reason: 'Asignación manual',
      assigned_by: assignedBy,
    },
  ]);
}

export async function resolveConversation(
  conversationId: string,
  resolutionNotes?: string
): Promise<void> {
  await supabase
    .from('support_conversations')
    .update({
      status: 'RESOLVED',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (resolutionNotes) {
    const { data: conversation } = await supabase
      .from('support_conversations')
      .select('assigned_agent_id')
      .eq('id', conversationId)
      .single();

    if (conversation?.assigned_agent_id) {
      await supabase.from('support_conversation_messages').insert([
        {
          conversation_id: conversationId,
          sender_id: conversation.assigned_agent_id,
          sender_type: 'ADMIN',
          message: resolutionNotes,
          message_type: 'TEXT',
          is_internal_note: false,
        },
      ]);
    }
  }
}

export async function rateConversation(
  conversationId: string,
  rating: number,
  comment?: string
): Promise<void> {
  await supabase
    .from('support_conversations')
    .update({
      rating,
      rating_comment: comment,
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
    })
    .eq('id', conversationId);
}

export async function fetchUserConversations(
  userId: string
): Promise<SupportConversation[]> {
  const { data, error } = await supabase
    .from('support_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchConversationById(
  conversationId: string
): Promise<SupportConversation | null> {
  const { data, error } = await supabase
    .from('support_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) throw error;
  return data;
}
