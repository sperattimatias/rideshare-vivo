import { supabase } from '../../lib/supabase';

export async function getUnreadSupportMessageCount(userId: string): Promise<number> {
  const { data: conversations, error: conversationsError } = await supabase
    .from('support_conversations')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['OPEN', 'IN_PROGRESS', 'WAITING_RESPONSE']);

  if (conversationsError) {
    throw conversationsError;
  }

  if (!conversations || conversations.length === 0) {
    return 0;
  }

  const conversationIds = conversations.map((conversation) => conversation.id);

  const { count, error: messagesError } = await supabase
    .from('support_conversation_messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', conversationIds)
    .neq('sender_id', userId)
    .is('read_at', null);

  if (messagesError) {
    throw messagesError;
  }

  return count || 0;
}
