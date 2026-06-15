-- ============================================================
-- PUSH AUTOMÁTICO — trigger no INSERT de `notificacoes`
-- Dispara a Edge Function `enviar-push` via pg_net (HTTP assíncrono).
-- Resiliente: qualquer falha aqui é engolida — NUNCA bloqueia a criação
-- da notificação.
--
-- Pré-requisito: guardar 2 segredos no Vault (uma vez):
--   select vault.create_secret('https://ieekdxxmhkbslskgxbdg.supabase.co', 'project_url');
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
-- ============================================================

create extension if not exists pg_net;

create or replace function public.notificar_push()
returns trigger
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  v_url   text;
  v_key   text;
begin
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url'      limit 1;
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key' limit 1;

    if v_url is null or v_key is null then
      return new; -- segredos ausentes: não envia, mas não quebra o insert
    end if;

    perform net.http_post(
      url     := v_url || '/functions/v1/enviar-push',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body    := jsonb_build_object('record', to_jsonb(new))
    );
  exception when others then
    -- engole qualquer erro de push; a notificação já foi gravada
    null;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notificacoes_push on public.notificacoes;
create trigger trg_notificacoes_push
  after insert on public.notificacoes
  for each row execute function public.notificar_push();
