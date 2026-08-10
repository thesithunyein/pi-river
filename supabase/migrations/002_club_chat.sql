-- Club live chat (run in Supabase SQL editor once).
-- Safe to re-run.

create table if not exists public.club_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null default 'Player',
  avatar_url text,
  body text not null check (char_length(trim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists club_chat_messages_created_at_idx
  on public.club_chat_messages (created_at desc);

alter table public.club_chat_messages enable row level security;

drop policy if exists "club_chat_select_auth" on public.club_chat_messages;
create policy "club_chat_select_auth"
  on public.club_chat_messages for select
  to authenticated
  using (true);

drop policy if exists "club_chat_insert_own" on public.club_chat_messages;
create policy "club_chat_insert_own"
  on public.club_chat_messages for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Realtime (Dashboard → Database → Replication also works)
do $$
begin
  begin
    alter publication supabase_realtime add table public.club_chat_messages;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
