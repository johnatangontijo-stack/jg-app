# Deploy das Edge Functions — Aprovações

## Pré-requisitos
```bash
npm install -g supabase
supabase login
supabase link --project-ref ieekdxxmhkbslskgxbdg
```

## 1. Configurar o secret da API
```bash
supabase secrets set APROVACOES_API_SECRET=sua_chave_secreta_aqui
```
Guarde esta chave — ela vai no header `Authorization: Bearer <chave>` de cada requisição enviada pelo sistema JG Interno.

## 2. Deploy das funções
```bash
supabase functions deploy aprovacoes-receber
supabase functions deploy aprovacoes-responder
```

## 3. URLs das funções após deploy
- Receber: `https://ieekdxxmhkbslskgxbdg.supabase.co/functions/v1/aprovacoes-receber`
- Responder: (interno, chamado pelo app via supabase client ou fetch)

## 4. Testar com curl
```bash
curl -X POST https://ieekdxxmhkbslskgxbdg.supabase.co/functions/v1/aprovacoes-receber \
  -H "Authorization: Bearer sua_chave_secreta_aqui" \
  -H "Content-Type: application/json" \
  -H "X-Client-ID: cli_teste" \
  -d '{
    "evento": "nova_aprovacao",
    "versao": "1.0",
    "timestamp": "2026-06-09T14:32:00Z",
    "aprovacao": {
      "id": "apr_teste_001",
      "cliente_id": null,
      "cliente_nome": "TechBrasil Store",
      "social_media_responsavel": "Ana Lima",
      "tipo_conteudo": "estatico",
      "plataforma": "instagram",
      "data_publicacao_prevista": "2026-06-15T10:00:00Z",
      "descricao_post": "Post de teste do sistema de aprovações",
      "conteudo": {
        "tipo_entrega": "link",
        "url": "https://drive.google.com/file/d/XXXXX",
        "nome_arquivo": "post_teste_v1.jpg",
        "formato": "jpg",
        "tamanho_bytes": 1024000
      },
      "legenda_sugerida": "Confira nossa nova coleção! 🚀",
      "prazo_resposta": "2026-06-12T18:00:00Z"
    },
    "callback": {
      "url_resposta": "https://seu-sistema.com/webhook/resposta",
      "token": "tkn_callback_123"
    }
  }'
```

## Resposta esperada
```json
{
  "recebido": true,
  "aprovacao_id": "apr_teste_001",
  "status": "aguardando_aprovacao"
}
```
