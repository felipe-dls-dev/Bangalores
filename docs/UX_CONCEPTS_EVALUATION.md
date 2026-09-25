# Conceitos de UX (docs/ux-concepts): avaliação e o que foi implementado

Avaliação feita em 2026-09-25 (v0.8.118 a v0.8.124). Os 11 conceitos são **referências de direção**, não
telas para copiar: mostram como o jogo poderia se comunicar melhor. A regra de trabalho foi: implementar o
que o jogo **realmente** consegue mostrar com os dados e regras que existem, sem inventar mecânica nova, e
deixar de fora o que exigiria conteúdo ou sistema que ainda não existe.

Tudo vale **só no modo Moderno** (`src/ui/uiMode.ts`). O modo Clássico não mudou em nenhuma tela.
As imagens dos conceitos ficam em `docs/ux-concepts/` (27 MB; não estão no git de propósito).

## Resumo

| # | Conceito | Decisão | Versão |
| --- | --- | --- | --- |
| 01 | Seleção de herói | Implementado | 0.8.118 |
| 02 | Mapa e exploração | Já existia quase tudo; não refeito | n/a |
| 03 | Evento e chefe | Chefe implementado; evento de 3 escolhas não | 0.8.120 |
| 04 | Combate tático | Previsão e faixa de turno implementadas; resto não cabe | 0.8.119 |
| 05 | Recompensas e saque | Implementado (sem "escolha 1 relíquia") | 0.8.120 |
| 06 | Personagem e equipamento | Equipamento com boneco central implementado | 0.8.123 |
| 07 | Loja e forja | Forja implementada; Loja já cobre o conceito | 0.8.121 |
| 08 | Crônica e coleção | Abas implementadas | 0.8.124 |
| 09 | Guilda e cooperação | Guilda em abas; sala cooperativa não | 0.8.124 |
| 10 | Tutorial e onboarding | O passeio guiado já faz isso; não refeito | n/a |
| 11 | Criador de cartas e galeria | Checklist no criador e correção; resto não | 0.8.124 |

## O que cada implementação usa de verdade

- **01 Seleção de herói** (`HeroSelectModern`, `heroProfiles`): vida, ataque, defesa e habilidade vêm de
  `herois.json`. Função, marcas de estilo e dificuldade são **texto editorial** meu (a partir da habilidade
  de cada classe), não medição de balanceamento: a dificuldade descreve quantas decisões o kit pede.
  Não há barras "Magia/Suporte/Mobilidade" do conceito porque o jogo não tem esses números.
  As artes leves (`public/assets/ui/select/`, 1,4 MB no total contra 25 MB) saem de
  `scripts/make_hero_select_assets.py`; as artes originais dos heróis não foram alteradas.
- **04 Previsão de combate** (`store/combatPreview.ts`, `CombatForecast`): enumera as 36 combinações de dados
  e resume dano mínimo, máximo e médio, crítico, esquiva, escudo e risco de derrota. O teste
  `combatPreview.test.ts` confere a previsão contra o combate de verdade (ataque real com dados forçados) em
  14 cenários do herói e 6 do inimigo, e mutações nas regras quebram o teste. Só no combate solo.
- **03 Chefe** (`BossIntroModern`, `bossData`): as fases (limiar de vida, +1 de Ataque, capangas,
  regeneração) são as que `playerAttack` aplica; o teste luta de verdade e compara. Fraquezas vêm da tabela
  de elementos (chefe sem elemento é Sombra, como no combate).
- **05 Vitória** (`VictoryModern`, `dropCompare`): a comparação simula o `equip` real (inclusive anel indo para
  o segundo espaço e facas soltando a mão esquerda) e o teste o compara com o jogo em dezenas de peças.
- **06 Equipamento** (`PaperdollModern`): reaproveita a comparação da Vitória. "Retirar" avisa quando a
  mochila está cheia (antes a ação falhava calada).
- **07 Forja** (`ForgeCatalogModern`, `forgeData`): a página tinha mais de 48 mil px porque desenhava as 234
  receitas de uma vez. Agora é lista compacta com etiqueta "Pronta / Faltam N" e a receita escolhida em
  detalhe. A etiqueta é conferida contra `craftEquipment` nas 234 receitas em 5 cenários.
- **08/09 Abas** (`SectionTabs`): Crônicas (6 abas) e Guilda (3 abas; contratos de 12 em 12).

## O que ficou de fora e por quê

- **02 Mapa:** a tela de região já tem "Local atual" com exploração, perigo, chefe, recompensas e o botão de
  explorar. O mapa-múndi não tem rota clicável (removida de propósito: só ANTERIOR/PRÓXIMA região).
- **03 Evento com 3 escolhas (requisito, risco, recompensa):** os eventos do jogo são "aceitar ou seguir" com
  um efeito só. Faltaria conteúdo novo (e regras de requisito), não interface.
- **04 Ordem de turnos, grade de ameaça, grupo de 4 heróis:** o combate é um duelo por dados. Isso é sistema
  novo, não tela.
- **05 "Escolha uma relíquia entre três":** exige a mecânica de escolha de saque, que não existe.
- **07 Loja:** já tem busca, abas, carrinho, comparação e comprar/vender.
- **09 Sala cooperativa:** não foi tocada; o ganho visual não compensa o risco sem um teste ao vivo com duas
  contas (Supabase). Vale reavaliar junto com a decisão do modo convidado.
- **10 Tutorial:** o passeio guiado já mostra "passo X de N", título, texto, destaques e dica. O manual de 27
  capítulos poderia ganhar busca; não foi feito.
- **11 Criador de cartas:** é uma ferramenta "em construção" sem regras definidas. Entrou só o checklist de
  situação e a correção da imagem quebrada. Rascunho, moldura e recorte guiado dependem de decisão de produto.
  A Coleção (galeria) já tem busca e filtros.

## Arte

Nenhum pedido novo ao Codex foi necessário: todas as telas usam arte que já existe. Se quiser mais
atmosfera depois, os candidatos naturais são fundos de arena por região (combate), uma ilustração de fundo
para a Forja e um fundo de livro para as Crônicas.

## Como testar (para quem mexer nisso depois)

- Digitação: use `npx tsc -b` (é o que o CI roda). `tsc --noEmit -p .` não checa nada neste projeto.
- `npm test` roda tudo; `combatPreview`, `bossData`, `dropCompare` e `forgeData` comparam a interface com o
  jogo de verdade, então uma regra alterada em `store/game.ts` faz um deles falhar.
- Verificação no navegador: Playwright com o Chrome instalado, larguras de 360 a 1920, nos dois modos.

## Cooperativo (v0.8.125)

As telas do modo solo foram levadas ao coop, também só no Moderno:

- **Previsão de combate** (`online/coopPreview.ts`): usa as contas do coop, que não são as do solo (o golpe do
  herói não tem fraqueza elemental nem postura quebrada, a defesa do inimigo vem da dificuldade dele e o
  inimigo sorteia quem ataca). Por isso mostra também a **chance de ser o alvo** (provocação decide, senão
  sorteio entre os vivos) e quantos capangas atacam depois. Só entra 1,8 s depois de começar o seu turno, para
  dar tempo de ler a rolagem anterior.
- **Resumo do chefe e do grupo** no aviso "Enfrentar chefe" (`CoopBossBriefing`): fases, fraquezas, a sua arma
  contra ele e a vida de cada membro, com a recomendação (alguém caído ou preso em outra atividade bloqueia).
- **Vitória com painel do grupo** (`VictoryModern`): dano, cura e dano evitado de cada membro e a parte de cada
  um na recompensa, pelo mesmo rateio que paga ouro e XP (`coopRewardShare`).
- As contas de dado do coop viraram funções puras em `online/coopMath.ts`, usadas pelo combate de verdade
  (`CoopContext.tsx`) e pela previsão, então uma não pode divergir da outra. O rateio da recompensa também.

**Bug corrigido no caminho:** no turno do inimigo do coop, condições do inimigo (congelado, cego, agarrado)
SOMAVAM no dado de ataque dele (sinal invertido): um inimigo congelado acertava mais forte. No solo a
condição reduz. Agora reduz nos dois.

**Divergência conhecida, não alterada** (mexe no equilíbrio do coop; decisão de produto): o golpe do herói no
coop usa `dificuldade − 2` como defesa do inimigo, enquanto o solo usa a defesa real (`enemyDefenseValue`). O
coop já teve esse mesmo ajuste feito para as feras do Conjurador. A Previsão mostra o que o coop faz de fato.

**Como foi verificado:** testes de unidade contra a conta de referência (e mutações) e um teste de ponta a
ponta com dois navegadores no Supabase de verdade: sala, entrada, chefe, combate até a vitória. Em 8 golpes
reais, o dano ficou sempre dentro da faixa prevista; o painel do grupo apareceu para os dois jogadores com
as partes somando 100%; no Clássico a mesma batalha continua igual (sem Previsão, resumo nem painel).
