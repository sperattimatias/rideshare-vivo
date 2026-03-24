/*
  # Add Foreign Keys to User Profiles for Support System

  1. Changes
    - Add foreign key from support_conversations.user_id to user_profiles.id
    - Add foreign key from support_conversations.assigned_agent_id to user_profiles.id
    - Add foreign key from support_conversation_messages.sender_id to user_profiles.id
    
  2. Notes
    - These foreign keys are essential for the chat system to fetch user information
    - The relationships enable proper joins in queries
    - Uses CASCADE on delete to maintain referential integrity
*/

-- Add foreign key for conversation user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'support_conversations_user_id_fkey'
    AND table_name = 'support_conversations'
  ) THEN
    ALTER TABLE support_conversations
      ADD CONSTRAINT support_conversations_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key for conversation assigned_agent_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'support_conversations_assigned_agent_id_fkey'
    AND table_name = 'support_conversations'
  ) THEN
    ALTER TABLE support_conversations
      ADD CONSTRAINT support_conversations_assigned_agent_id_fkey
      FOREIGN KEY (assigned_agent_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key for message sender_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'support_conversation_messages_sender_id_fkey'
    AND table_name = 'support_conversation_messages'
  ) THEN
    ALTER TABLE support_conversation_messages
      ADD CONSTRAINT support_conversation_messages_sender_id_fkey
      FOREIGN KEY (sender_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
