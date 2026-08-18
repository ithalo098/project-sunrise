# Abrir direto no tracker (sem tela de login)

## O que muda
- O app abre imediatamente no tracker; ninguém precisa criar conta nem entrar.
- A tela de login deixa de existir e o botão "Sair" some do perfil.
- Os registros de café continuam funcionando normalmente e passam a ficar salvos no próprio aparelho, então não se perdem ao fechar o app.
- Continua otimizado para iOS/mobile: tela cheia, área segura respeitada, sem barra de rolagem visível.

## Detalhes técnicos
- `src/routes/index.tsx`: remover import do cliente Supabase, os estados `session`/`loading`, o `useEffect` de `getSession`/`onAuthStateChange`, os `navigate({ to: '/auth' })`, os early-returns e o botão de sign-out.
- Persistir `logs` em `localStorage` (leitura em `useEffect` após hidratação para evitar mismatch de SSR, gravação a cada mudança), com datas serializadas em ISO.
- Excluir `src/routes/auth.tsx`; o gerador de rotas atualiza `routeTree.gen.ts` sozinho.
- Manter `src/lib/coffee.functions.ts` como está (não é importado pela home).
- Verificação iOS: rodar o app no viewport mobile via Playwright, conferir console sem erros, que o tracker renderiza direto em `/`, que registrar café funciona e que o vídeo hero tem `playsInline`/`muted`/`autoPlay` (requisito de autoplay no Safari iOS); ajustar se faltar algum desses atributos.
