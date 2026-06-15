# JG App — Visão de Produto & Roadmap

## O que é
App mobile-first de **gestão da agência Joni Gontijo** (tráfego pago + produção de conteúdo). Dois públicos no mesmo binário:

- **Equipe interna** (`admin / gerencia / head / financeiro / social_media / trafego / ia / sites`) — ferramenta de operação tipo CRM+ERP da agência: clientes, demandas/tarefas, agenda de gravações, financeiro (MRR, pagamentos, faturamento diário), metas, NPS, feedbacks, networking, equipe, aprovação de criativos, dashboard com health-score por cliente.
- **Cliente da agência** (`cliente`) — portal de acompanhamento: produções/criativos, aprovar peças, métricas de tráfego, metas, agenda, marca/DNA, NPS, feedback, WhatsApp.

Backend: Supabase (Auth + Postgres + Edge Functions Deno). Stack: Expo 56 / RN 0.85 / expo-router / Zustand.

## Progresso
- ✅ **#1 Responsividade + ícones** — `ResponsiveTabBar` (4/6/7 abas + "Mais"), `useResponsive`, `Icon`+`IconText`, `setores.ts`. Dashboard reativo + svg nativo. 0 emojis-pictograma (só ✓✗→). Tipos Supabase reconciliados (database.ts).
- ✅ **#2 Push (código)** — Edge Function `enviar-push` + trigger pg_net + cliente (projectId/canal) + tela `notificacoes` + tap-handler. **Deploy pendente → PUSH_SETUP.md**.
- ✅ **#3 PWA** — manifest + service worker + ícones + injeção runtime (`setupPWA` no `_layout`). Deploy: `expo export -p web` → Vercel.
- 🔜 **#4 Android** — `eas.json` pronto; falta `eas login`+`eas init`+`eas build` (dono) → ANDROID_SETUP.md.

> Build limpo: `tsc` 0 erros, bundles web+android 200.

## Estado original (antes do trabalho)
- ⚠️ Push sem sender · 12 bottom tabs · design "cara de IA" (emojis, layout não-reativo).
- ⚠️ Migrations SQL soltas na raiz (não versionadas em `supabase/migrations`).

## Roadmap (fases)

### Fase 1 — Design system (tirar cara de IA)
- Trocar **emojis → ícones reais** (`@expo/vector-icons` lucide/feather).
- Redefinir **paleta** a partir da identidade real da marca JG (precisa input do dono).
- **Tipografia** custom (`expo-font`), hierarquia + espaçamento consistente.
- Refinar Badge/Card/Button + estados loading/empty/error + micro-interações.
- Remover copy fofa ("Deixa com a gente!").

### Fase 2 — Responsividade
- `useWindowDimensions` (reativo) no lugar de `Dimensions.get`.
- Breakpoints phone/tablet/web-wide; grids adaptáveis.
- **Reorganizar navegação**: 4–5 tabs principais + tela "Mais"/drawer pro resto (por role).
- SafeArea, teclado, telas longas.

### Fase 3 — Notificações end-to-end
- Edge Function `enviar-push` + trigger `AFTER INSERT ON notificacoes` (pg_net já ativo) → Expo Push API usando `push_tokens`.
- Categorias: nova demanda, peça aguardando aprovação, resposta de aprovação, pagamento, NPS.
- Deep links (expo-router) ao tocar.
- Web push pro PWA (service worker + VAPID, ou OneSignal/FCM web).

### Fase 4 — PWA
- `manifest.json` (ícones, theme color, display standalone, start_url).
- Service worker (offline shell + cache) via workbox.
- Ícones/splash PWA; testar "Adicionar à tela inicial".
- Web push.

### Fase 5 — Android (Play Store)
- EAS Build (`eas.json` já existe) → AAB.
- Credenciais FCM pro push.
- Ícones/splash adaptáveis (já em app.json), política de privacidade, listing, conta dev Google ($25).

### Fase 6 — Hardening
- Auditoria RLS (cliente só vê seus dados).
- Mover migrations soltas → `supabase/migrations` versionadas.
- Sentry (erros), analytics, testes.

## Decisões pendentes do dono
1. Plataforma prioritária: PWA primeiro, Android primeiro, ou paralelo.
2. Identidade visual: já tem marca/cores definidas ou proponho direção nova.
3. Onde começar: design system, responsividade ou notificações.
