# Melhorias Futuras de Segurança (Opcionais)

Documento para referência futura. Estas melhorias não são obrigatórias para o lançamento, mas podem ser implementadas depois para reforçar ainda mais a segurança.

---

## 1. Validação de força de senha no registro

- Exigir senha com mínimo de caracteres, letras maiúsculas/minúsculas, números e símbolos
- Bloquear senhas comuns (ex.: "123456", "password")
- Onde: fluxo de registro (`/api/registro`)

---

## 2. Rate limiting no login

- Limitar tentativas de login por IP (ex.: 5 tentativas em 15 minutos)
- Ajuda contra ataques de brute force
- Ferramentas: `@upstash/ratelimit` ou similar

---

## 3. Autenticação em duas etapas (2FA) para admin

- 2FA apenas para contas de administrador
- Usar TOTP (Google Authenticator, Authy) ou SMS
- Pacotes: `otplib`, `speakeasy` ou serviços como Twilio para SMS

---

## 4. Outras ideias

- Log de auditoria para ações sensíveis do admin
- Notificação por email quando admin faz login de novo dispositivo
- Bloqueio temporário de conta após muitas tentativas de login falhas
