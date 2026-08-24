-- Kitap Asistani (AI sohbet) icin sohbet ve mesaj tablolari.
-- Her sohbet bir kullaniciya ait, mesajlar sohbete bagli. RLS diger
-- tablolarla ayni desende: sadece sahibi okuyup yazabilir.

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

create policy "Users manage own ai_conversations" on ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own ai_messages" on ai_messages
  for all using (
    exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
