# Remover o cadastro/login do app

## O que muda
- A tela de login (`/auth`) deixa de existir: nada de usuário, senha ou criação de conta.
- Ao abrir o app, o usuário cai direto no Tracker, sem nenhuma verificação.
- O botão "Sair" no Perfil é removido, já que não há mais conta.
- Os registros de café continuam funcionando normalmente na sessão local do aparelho.

## Detalhes técnicos
- Excluir `src/routes/auth.tsx`.
- Em `src/routes/index.tsx`: remover o `useEffect` de `getSession`/`onAuthStateChange`, os estados `session`/`loading`, os guards `if (loading)` / `if (!session)`, o redirecionamento para `/auth`, o botão de logout e o import do cliente de backend.
- Nenhuma alteração de banco de dados; as tabelas existentes ficam intactas.
