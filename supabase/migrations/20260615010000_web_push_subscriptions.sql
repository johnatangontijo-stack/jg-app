-- Inscrições de Web Push (PWA — iOS 16.4+/Android/desktop).
-- Independente do push nativo (push_tokens). Guarda endpoint + chaves VAPID do device.

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);

alter table public.web_push_subscriptions enable row level security;

-- O cliente (anon) pode registrar/atualizar a própria inscrição (chave = endpoint).
-- Leitura/envio é feito com service_role (bypassa RLS).
drop policy if exists "web_push insert" on public.web_push_subscriptions;
create policy "web_push insert" on public.web_push_subscriptions
  for insert with check (true);

drop policy if exists "web_push update" on public.web_push_subscriptions;
create policy "web_push update" on public.web_push_subscriptions
  for update using (true) with check (true);
