# Ativação do cooperativo online

O modo solo continua funcionando sem configuração. Para ativar salas online em tempo real:

1. Crie um projeto gratuito em https://supabase.com.
2. Em **Authentication > Providers > Anonymous**, habilite logins anônimos.
3. Abra **SQL Editor**, copie o conteúdo de `supabase/migrations/202608130001_coop_foundation.sql` e execute.
4. Em **Project Settings > API**, copie a URL do projeto e a chave pública `anon`/`publishable`.
5. Para desenvolvimento, copie `.env.example` para `.env.local` e preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

6. No GitHub, abra **Settings > Secrets and variables > Actions > Variables** e crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
7. O workflow do GitHub Pages usa essas variáveis durante a compilação. Execute novamente o deploy.

## Segurança

A chave usada pelo navegador é pública por definição. A segurança está nas políticas RLS instaladas pela migração. Nunca coloque a `service_role` no projeto ou no GitHub Pages.

## Estrutura preparada

- autenticação anônima persistente;
- salas por código de seis caracteres;
- limite configurável de 2 a 4 jogadores (interface inicial para 2);
- presença e reconexão pelo Supabase Realtime;
- membros, heróis e prontidão;
- log ordenado de eventos da sala;
- estado compartilhado com controle otimista de versão;
- transferência automática da liderança quando o host sai;
- políticas RLS para impedir acesso de quem não participa da sala.

## Próximo estágio de gameplay

A fundação não altera ainda o combate solo. O próximo estágio deve definir o estado cooperativo oficial (heróis, iniciativa, inimigos, turnos, recompensas e derrota do grupo) e fazer o líder da sala atuar como autoridade lógica, usando `update_coop_room_state` e `append_coop_event`.
