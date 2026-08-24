# Arquitetura e convenções do código

Referência técnica para quem for mexer no código. Para regras de jogo (o que cada sistema faz),
veja `docs/GAME_MECHANICS.md`. Para ativar o cooperativo online, veja `docs/COOP_SETUP.md`.

## Stack

React 18 + TypeScript + Vite + Zustand (com `persist`) + Framer Motion + Supabase (Realtime, só
para o cooperativo). Testes com Vitest. Sem backend próprio: tudo roda no navegador, save em
`localStorage`.

## Onde fica cada coisa

- `src/store/game.ts` — **o arquivo principal**. Todo o estado do jogo (`useGame`, um store
  Zustand único) e quase toda a lógica de regras: combate solo, forja, equipamentos, talentos,
  masmorras, guilda, etc. É grande de propósito — a lógica de jogo fica centralizada aqui, não
  espalhada pelos componentes.
- `src/main.tsx` — toda a UI. Um arquivo único com todos os componentes de tela (`MapScreen`,
  `CombatScreen`, `ForgeScreen`, `EquipmentScreen`, etc.), roteados por `g.screen` num switch
  grande dentro do componente `App`.
- `src/online/CoopContext.tsx` — toda a lógica específica do cooperativo (criar/entrar em sala,
  resolver o turno do inimigo, ações compartilhadas). Ver seção "Solo vs. Coop" abaixo.
- `src/data/expansion.ts` (e outros arquivos em `src/data/`) — dados de conteúdo: equipamentos,
  monstros, talentos, especializações, materiais, receitas de forja, sub-regiões, etc.
- `src/styles.css` — **um arquivo único** com todo o CSS do jogo (sem CSS Modules/styled-
  components). Ver a pegadinha de cascata na seção CSS abaixo antes de editar media queries.
- `src/store/game.test.ts` — suíte de testes principal (Vitest), roda contra o store real
  (`useGame`), não mocks.
- `scripts/balance-sim.test.ts` — simulador de balanceamento que joga campanhas completas por
  classe usando o store real, para detectar problemas de progressão/dificuldade (não é um teste
  de correção, é uma ferramenta de análise — rode com `npm run test:balance`).

## Padrão de referência de instância de equipamento

Todo item de equipamento tem um **id de catálogo** (`baseId`, ex. `lamina_vento`) e, quando entra
na posse do jogador, ganha uma **referência de instância** (`baseId@@timestamp+random`, criada por
`createEquipmentInstance`). A referência de instância é a chave usada em todos os dicionários
por-cópia: `equipmentGems`, `equipmentUpgrades`, `craftedEffects`, `equipmentElements`,
`equipmentResistances`, `forgedGemLocked`.

Isso existe porque o jogador pode ter **duas cópias da mesma peça** (uma equipada, uma na
mochila) com bônus completamente diferentes — a referência de instância é o que distingue as
duas.

**Classe de bug recorrente neste código**: comparar/indexar por `baseId` (catálogo) quando
deveria ser por referência de instância, ou vice-versa; ou buscar a "cópia certa" numa ordem
(`[...bag, ...equipped]`) que prioriza a cópia errada quando existem duplicatas. Ao investigar um
"bônus que não parece estar somando" ou "afetou a peça errada", grep por `equipmentByRef`,
`equipmentBaseId`, `equipmentRefMatches` e confira se o código em questão usa a função certa para
o que está comparando. Ver a memória `bangalores-instance-ref-bug-pattern` para exemplos já
corrigidos.

## Solo vs. Coop: duas implementações paralelas

O modo solo (`game.ts`) e o cooperativo (`CoopContext.tsx`) **não compartilham a mesma máquina de
estados** — o coop reimplementa a lógica de cada ação (ataque, defesa, habilidade, invocação de
fera, etc.) operando sobre um `shared_state.battle` guardado no Supabase, resolvido de forma
autoritativa pelo host da sala via `updateState(current => {...})`.

Padrões a conhecer:

- **Turno do inimigo é host-autoritativo**: só o host chama `resolveEnemyTurn`, que computa TODO
  o turno (status ticks, ataques de feras, ataque do inimigo, capangas) numa única transformação
  síncrona e escreve o resultado de volta uma vez. Isso significa que eventos que aconteceriam em
  sequência no solo (várias feras atacando, um capanga de cada vez) precisam ser condensados num
  **array entregue de uma vez** (ex. `minionRolls`, `summonRolls`) que cada cliente consome
  localmente para decidir a animação — não uma sequência de escritas de rede.
- **`CoopBattleSync`** (`main.tsx`) é o componente que faz essa ponte: fica de olho nos campos de
  `battle` (`lastRoll`, `minionRolls`, `summonRolls`, etc.) via `useEffect`s chaveados por
  `` `${battle.id}:${battle.turn}` `` (ou similar), e dispara ações locais (`receiveCoopHeroAction`,
  `receiveCoopEnemyAttack`, etc.) que atualizam o estado **local** do jogador (`animating`,
  `lastDamage`, `animationActor`) — essas ações locais são as mesmas que fazem o card
  tremer/mostrar dano no solo.
- **Ao adicionar uma mecânica nova ao coop**, o padrão mais seguro é espelhar um mecanismo que já
  existe (ex. `summonRolls` foi construído copiando `minionRolls` quase literalmente) em vez de
  inventar um novo formato de array/evento.
- Nem toda mecânica do solo tem equivalente no coop ainda — é comum encontrar uma feature que
  funciona no solo mas nunca foi portada (ou foi portada parcialmente). Ao investigar um bug "só
  acontece no coop" ou "funciona no solo mas não no coop", isso costuma ser a explicação mais
  provável.

## CSS: cascata por ordem de arquivo

`styles.css` acumulou várias "eras" de layout (comentários no próprio arquivo marcam isso: v0.3.3,
v0.4.0, v0.4.3...). Mais de um bloco `@media` pode redefinir a mesma classe para a mesma faixa de
largura, em pontos diferentes do arquivo. Como o CSS resolve empates de especificidade **por
ordem de aparição no arquivo**, o bloco que aparece **por último** é o que realmente vale — blocos
anteriores com a mesma seletor+media query viram código morto silencioso.

Antes de editar uma media query existente (principalmente em `.combat-v033`, que tem várias),
faça `grep` pelo seletor no arquivo inteiro para confirmar qual ocorrência é a que efetivamente
está em vigor, e edite essa. Esse mesmo problema já mordeu este arquivo antes com
`.hero-grid`/`.char-grid` (ver comentário por volta da linha 827 do próprio `styles.css`).

## Testes

- `npm test` roda a suíte principal (`src/store/game.test.ts`) contra o store real via
  `useGame.getState()`/`useGame.setState()` — não há mocks do store em si, só de `Math.random`
  (via `vi.spyOn`) e de tempo (via `vi.useFakeTimers()`) quando a lógica depende de sorte ou de
  `setTimeout` encadeado.
- Padrão para bugs numéricos sutis e difíceis de conferir só lendo o código: escrever um teste
  descartável (`src/store/_scratch*.test.ts`, nunca commitado) que reproduz o cenário exato contra
  o store real, confirmar o comportamento antes/depois da correção, e só então apagar o arquivo —
  ou convertê-lo num teste permanente se a lógica for importante o bastante para travar contra
  regressão futura.
- `npm run test:balance` roda o simulador de campanhas completas (todas as classes, do nível 1 ao
  fim do conteúdo) contra o store real, para achar problemas de balanceamento (não são asserts de
  corretude, é uma ferramenta de observação — leia o relatório gerado).

## Verificação antes de considerar uma mudança pronta

Para qualquer mudança em `game.ts`, `main.tsx`, `CoopContext.tsx` ou `styles.css`:

```bash
npx tsc --noEmit -p .   # typecheck
npx vitest run          # suíte de testes
npx vite build          # build de produção
```

Os três devem passar limpos. Para mudanças de UI, também vale abrir o app (`npm run dev`) e testar
manualmente o fluxo afetado quando possível — nem sempre há uma ferramenta de navegador disponível
durante o desenvolvimento assistido; quando não houver, isso deve ser dito explicitamente em vez
de presumido como testado.
