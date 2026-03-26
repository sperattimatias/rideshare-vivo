import { fetchCategories, fetchDepartments, fetchUserConversations } from '../../lib/supportSystem';
import type { SupportCategory, SupportConversation } from '../../lib/supportSystem';

export interface SupportPageBootstrapData {
  conversations: SupportConversation[];
  categories: SupportCategory[];
}

export async function loadSupportPageData(userId: string): Promise<SupportPageBootstrapData> {
  const [conversations, , categories] = await Promise.all([
    fetchUserConversations(userId),
    fetchDepartments(),
    fetchCategories(),
  ]);

  return {
    conversations,
    categories,
  };
}
