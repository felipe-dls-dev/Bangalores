# Sistemas do jogo — referência de mecânicas

Este documento explica **como os sistemas do Bangalore's funcionam hoje**, do ponto de vista de
regras (não de código). Serve como referência de design e para tirar dúvidas de jogador. Para a
lista completa de itens, monstros, talentos etc., veja os arquivos em `src/data/` — este documento
descreve as *regras*, não reproduz as tabelas de dados (que mudam com frequência).

## Atributos e progressão

- Três atributos: **Vida**, **Ataque**, **Defesa**. Cada nível ganho concede **1 ponto de
  atributo** para distribuir livremente entre os três (tela **Ficha**).
- Vida também recebe bônus permanente de certos consumíveis (elixires de vida máxima) e de
  equipamentos/talentos/especializações — o valor mostrado na Ficha já soma tudo.
- XP vem de vitórias em combate (1 ouro ganho em combate = 1 XP; ouro de vendas não conta),
  missões da Guilda e alguns eventos de exploração.

## Combate

- Cada ataque rola um dado de **Ataque** (d6) contra um dado de **Defesa** (d6) do alvo. O
  resultado líquido determina o dano.
- **Rolagem natural 6** no ataque = acerto crítico. Também dá **50% de chance** de aplicar a
  condição elemental do atacante no alvo (ver seção Elementos abaixo).
- **Rolagem natural 1** no ataque = falha crítica: o atacante causa dano em si mesmo em vez de
  atacar.
- **Postura defensiva**: +2 de Defesa até o fim da batalha ou até desativar. A primeira ativação
  não consome o turno; reativar depois de desativar consome.
- **Fervor de Combate**: acumula até 3 acertos consecutivos e, ao completar, garante um ataque
  crítico automático (consome o acúmulo).
- **Fuga**: rola um dado — 5–6 escapa, 4 mantém a ação (não foge, mas não perde o turno), 1–3
  encerra o turno sem escapar.
- Condições negativas (sangramento, queimando, envenenado, etc. — ver Elementos) causam dano ou
  efeito por alguns turnos e depois se dissipam sozinhas.
- **Habilidade do herói** e **habilidade de equipamento** (item com efeito ativo) têm uso único
  por batalha no modo solo. No cooperativo, a habilidade do herói pode ser usada uma vez **por
  jogador presente na sala**; a habilidade de equipamento continua com um único uso, compartilhado
  pelo grupo inteiro.
- **Feras invocadas** (exclusivo do Conjurador): até 2 feras vivas simultaneamente, escolhidas
  entre ofensiva, defensiva e arcana ao gastar a habilidade do herói. Cada fera ataca o inimigo
  principal uma vez por turno, com sua própria rolagem; a fera arcana concede +10% de Ataque e
  Defesa ao herói enquanto estiver viva, e a defensiva tem alta chance de interceptar ataques
  destinados ao herói.

## Elementos e resistências

Sete elementos, cada um ligado a uma condição negativa:

| Elemento | Condição |
|---|---|
| Físico | Sangramento (dano contínuo) |
| Fogo | Queimando (dano contínuo) |
| Natureza | Envenenado (dano contínuo) |
| Gelo | Congelado (perde ações) |
| Sombra | Agarrado (perde ações) |
| Luz | Cego (perde ações) |
| Arcano | Atordoado (perde a próxima ação) |

- O elemento de dano da sua **arma** decide qual condição você pode aplicar num acerto crítico
  (50% de chance por crítico).
- **Resistência** a um elemento (concedida por peças de armadura/acessório sintonizadas, ou por
  algumas peças de loot de chefe) reduz em 1 o dano de ataques inimigos daquele elemento e impede
  que a condição correspondente seja aplicada em você.
- **Serviço de sintonia elemental** (tela da Forja): por 80 ouro + 3 materiais da afinidade
  escolhida, sintoniza o elemento de dano da arma equipada, ou concede resistência elemental a
  qualquer outra peça equipada (exceto a bolsa). Pode ser refeito quantas vezes o jogador quiser,
  sempre pagando o custo de novo.

## Equipamentos

- Slots: Amuleto, Capacete, Anel 1, Peitoral, Anel 2, Calças, Mão esquerda, Mão direita, Botas, e
  a Bolsa (só define a capacidade da mochila, não é peça de combate).
- Raridades, da mais fraca à mais forte: Comum, Incomum, Raro, Épico, Lendário, Mítico (mais o
  tier especial Heroico, exclusivo dos heróis jogáveis).
- **Aprimoramento (+1/+2/+3)**, feito na Forja, reforça os atributos base do item:
  - Cada nível custa ouro (cresce com nível do item e raridade) **e materiais** (fragmento físico
    sempre; essência mágica a partir do alvo +2).
  - Chance de sucesso cai por nível-alvo: +1 é bem provável, +2 é raro, +3 é uma aposta.
  - Falhar em +2 ou +3 tem chance de **regredir** o nível do item em 1 (não só "não avançar").
  - Toda tentativa (sucesso ou falha) concede XP de Forja; falha consome metade dos materiais e
    não produz nada.
- **Pedras** (gemas) dão bônus de atributo nos encaixes livres de uma peça, instaladas na Oficina
  de desmontagem. Uma pedra removida é destruída, não devolvida.
- **Conjuntos de equipamento**: usar 2 peças do mesmo conjunto dá um bônus menor; 4 peças dão um
  bônus maior. Consulte o resumo de build nas Crônicas para ver o progresso de cada conjunto.
- A tela de Equipamentos mostra, para cada estatística, quanto vem do item base, quanto vem de
  aprimoramento (Forja) e quanto vem de pedra — para não confundir as três fontes.

## Forja

- **Materiais**: três origens diferentes — materiais de região (dropados por vitórias em combate,
  específicos de cada região), materiais de desmontagem (fragmento físico e essência mágica,
  obtidos desmontando equipamentos), e pedras (também de desmontagem, usadas tanto como bônus de
  encaixe quanto como moeda de refino).
- **Fabricar uma receita**: peças Comuns só pedem materiais. A partir de Incomum, fabricar também
  sacrifica uma peça pronta de raridade uma abaixo (Incomum pede 1 Comum, Raro pede 2 Incomuns,
  Épico pede 3 Raros, Lendário pede 3 Épicos) — qualquer peça da raridade certa serve, não precisa
  ser do mesmo tipo de item.
- **Bônus de atributo/efeito especial** (a partir de Incomum) não cria uma peça nova: exige que
  você já tenha a MESMA peça sem bônus (na mochila ou equipada) e a **refina no lugar**. O bônus
  fica permanente, preso a essa cópia específica.
- **Nível de Forjador**: sobe com XP de Forja (ganho em toda tentativa, sucesso ou falha). Níveis
  maiores liberam receitas mais fortes e aumentam a chance de sucesso das receitas (não afeta a
  chance de aprimoramento, que é fixa por nível-alvo).
- Resultado de qualquer tentativa (fabricação ou aprimoramento) aparece numa janela modal com
  sucesso/falha e a mensagem detalhada.

## Talentos e especializações

- **Talentos**: desbloqueados automaticamente e de graça ao atingir o nível exigido — não há
  "pontos de talento" para gastar, é só clicar em "Desbloquear" quando disponível. Ficam
  permanentes e se acumulam, mesmo trocando de equipamento.
- **Especializações**: decisões de build nos níveis 10, 25, 50 e 75. Cada tier oferece algumas
  opções mutuamente exclusivas; a escolha é permanente até ser redefinida (custo em ouro que
  cresce a cada redefinição).

## Masmorras

- Sequência crescente de salas dentro de uma sub-região escolhida como base.
- Um chefe aparece a cada **5ª sala**, mas só conta como o chefe "de verdade" da sub-região (para
  o mapa e o Salão da Vingança) se a exploração normal daquela sub-região já tiver sido cumprida
  antes — senão é só uma sala mais difícil.
- Trocar de sub-região com uma expedição em andamento encerra o progresso atual.

## Guilda

- Contratos com rank mínimo de reputação para aceitar. Tipos: caça geral, caça específica,
  contrato de chefe e contrato de entrega (pede um item específico na mochila ou equipado).
- Reputação sobe ao resgatar recompensas; ranks maiores destravam contratos mais valiosos.

## Dificuldade da campanha

Três modos, cada um com multiplicador de força do inimigo e de recompensa:

| Modo | Inimigos | Recompensas |
|---|---|---|
| Aventura | ×0.88 | ×1.00 |
| Veterano | ×1.00 | ×1.12 |
| Lendário | ×1.22 | ×1.32 |

## Cooperativo

- Salas de 2 a 4 jogadores via Supabase Realtime (ver `docs/COOP_SETUP.md` para configurar).
- O **turno do inimigo é resolvido pelo host da sala** (autoridade única) e escrito de volta como
  um único estado compartilhado; cada cliente reage a esse estado localmente para tocar as
  animações certas (dano, cura, condições, feras invocadas, capangas de chefe).
- A maioria das mecânicas do solo tem equivalente direto no coop (postura defensiva, Fervor de
  Combate, especializações, feras invocadas, capangas de chefe), mas cada uma precisou de sua
  própria adaptação — nem sempre chegam ao coop ao mesmo tempo que chegam ao solo.
