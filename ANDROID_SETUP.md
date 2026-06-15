# Android (EAS Build) — setup

Pré-requisito: conta Expo do dono do app + EAS CLI (`npm i -g eas-cli` ou `npx eas-cli`).

## 1. Login + init (cria o projectId — também habilita push)
```bash
npx eas-cli login
npx eas-cli init        # cria o projeto EAS e grava extra.eas.projectId no app.json
```
> Sem esse `projectId`, o registro de push token falha (ver PUSH_SETUP.md). `eas init` resolve os dois de uma vez.

## 2. Credenciais de push (FCM Android)
```bash
npx eas-cli credentials      # Android → Push Notifications → configurar FCM v1
```
Subir o JSON da service account do Firebase (FCM). O Expo usa isso p/ entregar push no Android.

## 3. Build
```bash
# APK p/ teste/sideload (instala direto no celular)
npx eas-cli build -p android --profile preview

# AAB p/ Play Store
npx eas-cli build -p android --profile production
```
EAS roda na nuvem e devolve link do artefato. APK = instalar manual; AAB = subir na Play Console.

## 4. Submit (opcional, automático p/ Play Store)
```bash
npx eas-cli submit -p android --profile production
```
Precisa de `google-services-key.json` (service account com acesso à Play Console) — ver `eas.json` → submit.

## Notas
- `app.json` já tem `android.package = com.jonigontijo.jgapp`, ícones adaptativos e permissões.
- `expo-notifications` no plugins já pede POST_NOTIFICATIONS (Android 13+) no build.
- Web (PWA) é separado: deploy via `npx expo export -p web` → pasta `dist/` na Vercel (output SPA + `public/` com manifest/sw).
