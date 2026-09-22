-- Chat and message tables for the Book Assistant (AI chat).
-- Each chat belongs to a user, messages belong to a chat. RLS follows the
-- same pattern as the other tables: only the owner can read/write.
--
-- Note: create table is already idempotent (if not exists). drop policy if
-- exists was added before each create policy so this runs cleanly even if
-- schema.sql (001) already has these policies (fresh/local setup).

create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Yeni Sohbet',
  created_at timestamptz not null default now()
);

create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_conversations_user_id_idx on ai_conversations(user_id);
create index if not exists ai_messages_conversation_id_idx on ai_messages(conversation_id);

alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;

drop policy if exists "Users manage own ai_conversations" on ai_conversations;
create policy "Users manage own ai_conversations" on ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own ai_messages" on ai_messages;
create policy "Users manage own ai_messages" on ai_messages
  for all using (
    exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );