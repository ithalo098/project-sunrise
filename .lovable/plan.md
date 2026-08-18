# Plano de Implementação: SPECTRE COFFEE v2

Transformação do protótipo atual em uma plataforma completa de rastreamento competitivo de café, com autenticação, sistema de ranking robusto, validação por IA e gamificação.

## 1. Infraestrutura e Banco de Dados (Lovable Cloud)
- **Ativar Lovable Cloud** para persistência e autenticação.
- **Esquema de Banco de Dados:**
  - `profiles`: Perfil estendido (username único, bio, cidade, café favorito).
  - `coffee_entries`: Registros de café com volume, tipo e metadados.
  - `verification_images`: Metadados de imagens de validação (armazenamento privado).
  - `user_stats`: Agregação de XP, nível, streaks e totais competitivos.
  - `achievements` / `user_achievements`: Sistema de conquistas.
  - `follows`: Sistema social.
  - `seasons`: Gestão de temporadas de ranking.

## 2. Autenticação e Onboarding
- Implementar fluxo completo de login/cadastro com Supabase Auth.
- Suporte a Email/Senha e Google.
- Fluxo de Onboarding para coletar username único e configurar perfil inicial.

## 3. Core: Registro de Café com Validação
- **Interface de Registro:** Fluxo em etapas (Foto -> Validação -> Detalhes -> Confirmação).
- **Integração com IA:** Uso de Vision AI para detectar tipo de café e validar legitimidade da imagem.
- **Privacidade:** Upload de imagens para bucket privado com acesso via Signed URLs.

## 4. Gamificação e Ranking
- **Sistema de Ranking:** Implementar rankings diário, semanal, mensal e geral.
- **XP e Níveis:** Lógica de progressão baseada em atividade e conquistas.
- **Streaks:** Contador de dias consecutivos com visual de fogo (🔥).
- **Conquistas:** Implementar badges (Primeiro Gole, 7 Dias Seguidos, etc.).

## 5. UI/UX: Dashboard e Perfil
- **Home:** Dashboard com saudação, progresso diário e card de ranking rápido.
- **Perfil:** Página detalhada com estatísticas, badges e histórico visual.
- **Gráficos:** Visualização de consumo (Hoje, 7 dias, 30 dias) usando bibliotecas leves.

## Detalhes Técnicos
- **Frontend:** TanStack Start v1 (React 19), Tailwind v4.
- **Backend:** Server Functions (Supabase-integrated) para processamento de XP e Ranking.
- **Segurança:** Row Level Security (RLS) estrito em todas as tabelas.
- **IA:** Integração via AI Gateway para validação de imagens.

---
*Este plano abrange os requisitos 1 a 73 da solicitação do usuário.*
