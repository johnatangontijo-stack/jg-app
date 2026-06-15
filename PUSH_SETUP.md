# Push Notifications — setup

Pipeline: `notificacoes` INSERT → trigger `pg_net` → Edge Function `enviar-push` → Expo Push API → device.
Qualquer notificação criada (app ou edge functions) dispara push automaticamente. Tokens mortos são removidos sozinhos.

## 1. Cliente (já feito no código)
- `src/lib/notifications.ts`: registra Expo push token (canal Android `default`, usa `eas.projectId`, skip web/simulador).
- `app/_layout.tsx`: tap no push abre `/notificacoes`.
- `app/notificacoes.tsx`: tela de lista (marca lida / todas lidas, realtime).

> ⚠️ Push só funciona com **EAS projectId** configurado (ver ANDROID_SETUP.md → `eas init`). Sem ele, o registro de token falha silenciosamente.

## 2. Deploy da Edge Function (precisa do dono do projeto)
```bash
# uma vez
npx supabase login                      # PAT do dono do projeto Supabase
npx supabase link --project-ref ieekdxxmhkbslskgxbdg

# deploy
npx supabase functions deploy enviar-push
```

## 3. Segredos no Vault (SQL Editor do Supabase, uma vez)
```sql
select vault.create_secret('https://ieekdxxmhkbslskgxbdg.supabase.co', 'project_url');
select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
```

## 4. Trigger no banco
Aplicar `supabase/migrations/20260615000000_push_trigger.sql`:
```bash
npx supabase db push          # precisa de acesso ao DB
```
Ou colar o conteúdo do .sql no SQL Editor do Supabase.

## 5. Testar
```bash
# pega um token real de push_tokens e dispara direto:
curl -X POST https://ieekdxxmhkbslskgxbdg.supabase.co/functions/v1/enviar-push \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"profile_id":"<uuid-com-token>","titulo":"Teste","mensagem":"Funcionou!","tipo":"geral"}'
```
Ou inserir uma linha em `notificacoes` (o trigger dispara o resto).

## Alternativa sem SQL
Supabase Dashboard → Database → Webhooks → criar webhook em `notificacoes` (INSERT) → HTTP POST para a function `enviar-push` com header `Authorization: Bearer <service_role>`. Substitui os passos 3-4.
