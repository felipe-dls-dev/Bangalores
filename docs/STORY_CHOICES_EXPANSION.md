# Crônicas: 90 novas escolhas com efeito

Proposta de conteúdo e de motor para as escolhas da aba **Crônicas › História**. Escrita a partir do código da v0.9.10 (`STORY_CHAPTERS` em `src/data/expansion.ts`, `chooseStory` e `storyModifiers` em `src/store/game.ts`). Nada disto está no jogo ainda.

## 1. Resumo

- **30 capítulos novos, 3 escolhas cada = 90 escolhas.** Hoje a história tem 9 capítulos com 2 escolhas cada.
- **Toda escolha tem efeito mecânico real**, e o efeito aparece no botão antes de escolher. Hoje 7 das 16 escolhas não fazem nada; a seção 6 corrige essas.
- **Só usa os 5 tipos de requisito que o motor já conhece** (`victories`, `bosses`, `material`, `upgrade`, `region`). Nenhum tipo novo de requisito.
- **Cada caminho passa por 24 dos 30 capítulos.** A campanha tem 16 caminhos possíveis: honra ou lucro no Ato 1, com ou sem a caçada ao predador, Ignaris ou Morvath no Ato 3, e selar ou tomar a coroa.
- **A história cobre os 7 atos** de `STORY_ACTS`, incluindo Steelmere, que hoje não tem capítulo nenhum. O final da campanha (harmonia, soberania ou trono vazio) continua vindo da missão `q_steelmere_final_resonance`; os capítulos de Steelmere não o contradizem.
- **As três escolhas de cada capítulo seguem, em geral, a tríade Proteger / Lucrar / Arriscar**: uma ajuda alguém e dá bônus defensivo ou de sustento, uma dá recurso ou economia, e uma dá poder, quase sempre com um custo.
- **Custos existem e são visíveis:** ouro, material entregue, bônus negativo, ou **hostilidade regional** (os inimigos de uma região ganham +10% de vida pelo resto da campanha).
- **Tetos por bônus** (seção 5) impedem que um caminho especializado quebre o balanceamento. A soma dos efeitos de história é cortada no teto.

## 2. Mapa da campanha

`Nxx` são os capítulos novos; os nomes em minúsculas são capítulos que já existem.

```
prologo ─ Jurar proteção ──► N01 ► N02 ► sinais_lua ─ ritual ─────────────┐
        └ Exigir pagamento ► N03 ► N04 ► mercenario ─ guilda ────────────┤
              sinais_lua › guardar · mercenario › vender ► predador_lunar ┤
                                                                           ▼
  N05 ► N06 ► N07 (Floresta) ► N08 ► N09 ► N10 (Kaldrum) ► N11 ► N12 (Kholgard) ► forja_runas

forja_runas ─ luz ────► N13 ► N14 ► chama_escarlate ► N15 ► N16 ─┐  (Pico de Ignaris)
            └ sombra ─► N17 ► N18 ► mortos_falam ► N19 ► N20 ────┤  (Terras de Morvath)
                                                                   ▼
  N21 ► N22 ► N23 (Sol Negro) ► coracao ─ selar ► epilogo_luz ────┐
                                        └ tomar ► epilogo_sombra ─┤
                                                                   ▼
  N24 Frostgard ► N25 Engrenverde ► N26 Trilhouro ► N27 Vulcannis ► N28 Ferrujal ► N29 Coroferro ► N30 Aetherium ► epilogo_dois_mundos
```

## 3. Catálogo de efeitos

| Efeito | Quando vale | Onde entra no código | Situação |
|---|---|---|---|
| Ouro, material | Na hora | `chooseStory` | Já existe |
| Consumível (poção, elixir) | Na hora | `chooseStory` soma em `inventory` | Gancho trivial |
| Bênção de Proteção | Na hora | campo `protectionBlessings` | Campo já existe |
| Título | Permanente, cosmético | flag `titulo:<nome>`, já listada por `storyLoreTitles` | Já existe |
| Ataque, Vigor | Campanha toda | `storyModifiers().attack/defense` › `attributeSources` | Já existe |
| Destreza, vida máxima, Energia máxima, esquiva, resistência a elemento | Campanha toda | linhas `destreza`, `life` e `bonus` de `attributeSources` | Gancho pequeno |
| Crítico, dano contra chefes | Campanha toda | somar onde `specializationBonuses().crit/bossDamage` são lidos | Gancho pequeno |
| Ouro por vitória, chance de espólio, sucesso na Forja | Campanha toda | `storyModifiers().reward/drop/forge` | Já existe |
| XP | Campanha toda | XP da vitória no fim do combate | Gancho novo |
| Cura das poções | Campanha toda | uso de consumível de cura | Gancho novo |
| Desconto (ou acréscimo) na Loja | Campanha toda | preço de compra na vitrine e no carrinho | Gancho novo |
| Reputação na Guilda | Campanha toda | `claimGuildMission` | Gancho novo |
| Dano em uma região | Na região citada | dano do herói quando a sub-região atual é daquela região | Gancho novo |
| Hostilidade regional (custo) | Na região citada | vida do inimigo ×1,1 ao montar o inimigo daquela região | Gancho novo |
| Material extra em uma região | Na região citada | vitória: chance de +1 do material regional | Gancho novo |
| Ouro e XP nas Masmorras | Masmorras | recompensa da sala | Gancho novo |
| Carga do Golpe Supremo | Combate | ganho de `ultimateGauge` | Gancho novo |

Todos os ganchos novos são uma multiplicação ou soma num ponto que já existe; nenhum pede sistema novo.

## 4. Os 30 capítulos

Cada capítulo mostra: id, região, quem fala, de onde vem e para onde vai, a fala, o requisito (com o tipo que o motor já usa) e as três escolhas.

### Ato 1 · A Febre das Planícies

#### N01 · Água que Brilha
`agua_que_brilha` · Planícies de Alvora · fala: **Sela Hartwin** · vem de: prologo › Jurar proteção aos camponeses · segue para: N02 (`espantalho_de_valedouro`)

> O poço de Valedouro está brilhando. Brilhando! Água não brilha, a não ser que esteja muito feliz ou muito envenenada, e ninguém em Valedouro anda feliz. Me ajuda a decidir o que fazer antes que alguém beba e comece a enxergar no escuro.

**Requisito:** Vença 8 combates nas Planícies de Alvora (`victories · campos_dourados · 8`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Filtrar o poço com carvão e fibra**<br>`poco_filtrar` | O poço volta a servir, e Sela aprende a destilar remédio com a água limpa. | +10% de cura das poções · Poção de Cura ×2 | — |
| **Engarrafar a água brilhante e vender como tônico**<br>`poco_engarrafar` | O ouro é real. A desconfiança dos boticários também. | +30 de ouro | +5% nos preços da Loja |
| **Levar uma amostra da névoa ciana para estudar**<br>`poco_estudar` | Você entende a febre o bastante para ter medo com precisão. | +8% de resistência a arcano | — |

#### N02 · O Barão de Palha
`espantalho_de_valedouro` · Planícies de Alvora · fala: **Colm Aldric** · vem de: N01 · segue para: `sinais_lua`

> O Barão Espantalho está usando a MINHA armadura. A que eu perdi. Tá, "perdi" é forte: eu esqueci num campo. Ele levantou, vestiu e agora protege a plantação de todo mundo, inclusive dos donos.

**Requisito:** Derrote um chefe (`bosses · 1`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Devolver a armadura a Colm, amassada e tudo**<br>`barao_devolver` | Colm chora. Depois cobra menos de você. Depois chora de novo. | 5% de desconto na Loja | — |
| **Desmontar a armadura e aproveitar as peças**<br>`barao_desmontar` | Colm finge que não viu. A Forja agradece o metal encantado. | Fragmento Físico ×4 · +3% de sucesso na Forja | — |
| **Ficar com o peitoral encantado de palha**<br>`barao_vestir` | Coça. Mas nenhum corvo te bica desde então. | +1 Vigor | — |

#### N03 · Carga Sem Dono
`carga_sem_dono` · Planícies de Alvora · fala: **Toby Harlan** · vem de: prologo › Exigir pagamento pela investigação · segue para: N04 (`selos_de_latao`)

> Um comboio de remédios foi atacado na Ponte de Eldrimar e metade da carga ainda está lá, SEM DONO! Quer dizer, com dono. Com dono morto. O que tecnicamente é "sem dono", certo? Certo?! Diz que é certo.

**Requisito:** Vença 8 combates nas Planícies de Alvora (`victories · campos_dourados · 8`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Levar os remédios de volta à vila**<br>`carga_devolver` | Toby suspira como quem perdeu um amor. O padre da vila te abençoa. | +1 Bênção de Proteção · Poção de Cura ×1 | — |
| **Revender a carga no mercado paralelo**<br>`carga_revender` | Lucro rápido. Os bandoleiros de Alvora descobrem quem ficou com o que era deles. | +45 de ouro | inimigos das Planícies de Alvora com +10% de vida |
| **Ficar com as lâminas do comboio**<br>`carga_laminas` | Toby afia o fio de graça. "Propaganda", ele diz. | +3% de crítico | — |

#### N04 · Selos de Latão
`selos_de_latao` · Planícies de Alvora · fala: **Brenna Ashcombe** · vem de: N03 · segue para: `mercenario`

> Os bandoleiros usam ferramentas com selos de latão que nenhuma forja nossa sabe fazer. Traga fibra dourada para eu amarrar essas provas num relatório que alguém da capital vai fingir que leu.

**Requisito:** Reúna Fibra Dourada ×4 (`material · fibra_dourada · 4`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Entregar as provas à Guilda**<br>`latao_relatorio` | Brenna lê o relatório inteiro. Isso nunca tinha acontecido. | +10% de reputação na Guilda | entrega Fibra Dourada ×4 |
| **Derreter os selos e vender o latão**<br>`latao_derreter` | Ouro no bolso, pista no fundo do rio. | +35 de ouro | — |
| **Levar um selo para o ferreiro estudar**<br>`latao_ferreiro` | Borin vai odiar. E vai aprender. | +5% de sucesso na Forja | — |


### Ato 2 · As Vozes de Ferro

#### N05 · A Diplomacia dos Goblins
`diplomacia_goblin` · Floresta de Abdendriel · fala: **Kip Pé-Ligeiro** · vem de: sinais_lua › ritual · mercenario › guilda · predador_lunar · segue para: N06 (`reflexo_que_mente`)

> Os goblins da clareira querem conversar. Com você. Eu vou ficar aqui atrás dessa árvore dando apoio moral. De longe. Se eles gritarem, é normal. Se eles sorrirem, corre.

**Requisito:** Derrote um chefe da Floresta de Abdendriel (`region · floresta_lunargenta · 1`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Negociar uma trégua: estradas livres, clareira deles**<br>`goblins_tregua` | Os goblins cumprem o acordo e deixam seiva na sua fogueira. Quase sempre. Às terças, não. | +15% de chance de material extra na Floresta de Abdendriel | — |
| **Expulsar o bando da clareira**<br>`goblins_expulsar` | A clareira fica em silêncio. Os goblins ficam com rancor, e têm boa memória. | +1 de ataque | inimigos da Floresta de Abdendriel com +10% de vida |
| **Contratar os goblins como batedores**<br>`goblins_contratar` | Eles aceitam pagamento em botões e avisam de cada emboscada. | +2% de esquiva | −20 de ouro |

#### N06 · O Reflexo que Mente
`reflexo_que_mente` · Floresta de Abdendriel · fala: **Mestra Lyriel** · vem de: N05 · segue para: N07 (`raizes_que_choram`)

> O Lago do Espelho mostra quem você será. Ontem me mostrou velha e cercada de gatos; sorri por uma semana. Hoje ele mostra outra coisa: o Sol Negro, refletido onde deveria haver lua.

**Requisito:** Vença 10 combates na Floresta de Abdendriel (`victories · floresta_lunargenta · 10`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Encarar o reflexo até o fim**<br>`espelho_encarar` | Você vê o que te espera. E decide que não vai ser assim. | +10% de resistência a sombra | — |
| **Quebrar o espelho com a arma**<br>`espelho_quebrar` | Sete anos de azar? Lyriel diz que é lenda. Lyriel também conversa com musgo. | +3% de crítico | −3% de chance de espólio |
| **Colher a água do espelho para as poções**<br>`espelho_colher` | Poções com gosto de luar e um leve arrependimento. | +10% de cura das poções | — |

#### N07 · As Raízes que Choram
`raizes_que_choram` · Floresta de Abdendriel · fala: **A Árvore Anciã** · vem de: N06 · segue para: N08 (`neve_com_gosto_de_oleo`)

> Pequeno ser de carne. Algo bebe da minha seiva por baixo da terra: tubos frios, que zumbem. Eu não sei o que é "latão". Sei que dói.

**Requisito:** Derrote 3 chefes da Floresta de Abdendriel (`region · floresta_lunargenta · 3`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Selar os tubos e curar as raízes**<br>`raizes_curar` | A floresta respira. Um galho toca seu ombro com cuidado de avó. | +6 de vida máxima | — |
| **Seguir os tubos até a origem**<br>`raizes_seguir` | Os tubos descem para o norte, rumo às montanhas. A pista vale mais que a bênção. | +5% de XP | — |
| **Arrancar um tubo inteiro como prova**<br>`raizes_arrancar` | A Árvore geme. O metal é estranho, leve e ensina muito ao ferreiro. | Fragmento Físico ×3 · +4% de sucesso na Forja | — |

#### N08 · Neve com Gosto de Óleo
`neve_com_gosto_de_oleo` · Serra de Kaldrum · fala: **Torvald Barbaneve** · vem de: N07 · segue para: N09 (`o_ceu_tem_opiniao`)

> Alguém está perfurando MINHA montanha. Sem licença, sem capacete e sem convidar para o almoço! As brocas cantam à noite. Meus mineiros já estão aprendendo a letra.

**Requisito:** Vença 8 combates na Serra de Kaldrum (`victories · montanhas_cinzentas · 8`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Escoltar os mineiros até um túnel seguro**<br>`kaldrum_escoltar` | Torvald te ensina a sobreviver ao frio da serra e paga em minério. | +8% de resistência a gelo · Minério Cinzento ×3 | — |
| **Sabotar as brocas durante a noite**<br>`kaldrum_sabotar` | Silêncio na montanha. Os donos das brocas vão notar, e mandar gente. | +1 de dano contra chefes | inimigos da Serra de Kaldrum com +10% de vida |
| **Roubar uma broca inteira para Torvald**<br>`kaldrum_broca` | Torvald a abraça. Literalmente. Por muito tempo. | +4% de sucesso na Forja · +30 de ouro | — |

#### N09 · O Céu Tem Opinião
`o_ceu_tem_opiniao` · Serra de Kaldrum · fala: **Irmã Astrid** · vem de: N08 · segue para: N10 (`os_que_nao_voltaram`)

> As estrelas estão fora do lugar. Não "fora do lugar" poético: fora do lugar tipo alguém as EMPURROU. Sobe comigo ao Cume do Trovão. Se um raio nos atingir, pelo menos vai ser cientificamente interessante.

**Requisito:** Derrote 2 chefes da Serra de Kaldrum (`region · montanhas_cinzentas · 2`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Ajudar Astrid a remapear o céu**<br>`astrid_mapa` | Agora você sabe a hora exata de cada tempestade. E de cada emboscada. | +2% de esquiva | — |
| **Canalizar o raio na sua arma**<br>`astrid_raio` | Sua arma zumbe. Seu cabelo também, mas isso passa. Talvez. | +1 de ataque | — |
| **Vender a carta celeste ao consulado de Kholgard**<br>`astrid_vender` | Astrid te chama de "filisteu". Você teve que perguntar o que é. | +60 de ouro | — |

#### N10 · Os Que Não Voltaram
`os_que_nao_voltaram` · Serra de Kaldrum · fala: **Torvald Barbaneve** · vem de: N09 · segue para: N11 (`o_labirinto_tem_senha`)

> A Mina dos Anões Caídos tem esse nome por um motivo, e o motivo não é humor. Tem gente minha lá embaixo, ou o que sobrou. Traga minério para escorar os túneis e eu te mostro o caminho.

**Requisito:** Reúna Minério Cinzento ×6 (`material · minerio_cinzento · 6`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Resgatar os sobreviventes primeiro**<br>`mina_resgatar` | Três mineiros voltam para casa. Torvald chora e jura que é poeira. | +6 de vida máxima · +1 Bênção de Proteção | entrega Minério Cinzento ×6 |
| **Escorar a mina e reabri-la**<br>`mina_reabrir` | A mina volta a produzir, e uma parte do que sai dela é sua. | +15% de chance de material extra na Serra de Kaldrum · +5% de ouro por vitória | entrega Minério Cinzento ×6 |
| **Descer mais fundo, atrás das brocas**<br>`mina_descer` | Você encontra o que os mineiros encontraram. Você volta; eles não voltaram. | +1 de dano contra chefes · +4% de XP | — |

#### N11 · O Labirinto Tem Senha
`o_labirinto_tem_senha` · Kholgard · fala: **Borin Fenrick** · vem de: N10 · segue para: N12 (`cofre_dos_reis`)

> O Labirinto tem uma senha rúnica. Meu avô sabia. Meu avô também sabia onde deixou o martelo, e olha onde estamos. Resolve logo, antes que o Minotauro resolva você.

**Requisito:** Derrote um chefe de Kholgard (`region · khar_dur · 1`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Decifrar as runas com paciência**<br>`labirinto_decifrar` | Borin resmunga "nada mal". É o maior elogio que ele já fez. | +5% de sucesso na Forja | — |
| **Derrubar a parede mais fina**<br>`labirinto_derrubar` | Funciona. Kholgard inteira ouve. O Minotauro também. | +1 de ataque | inimigos de Kholgard com +10% de vida |
| **Mapear o labirinto e vender o mapa**<br>`labirinto_mapear` | Aventureiros pagam bem para não morrer, e você aprende a ler corredores. | +50 de ouro · +10% de ouro e XP nas Masmorras | — |

#### N12 · O Cofre dos Reis Anões
`cofre_dos_reis` · Kholgard · fala: **Borin Fenrick** · vem de: N11 · segue para: `forja_runas`

> O Cofre guarda metade da Coroa Partida. A outra metade está com quem começou essa bagunça. Traga runas anãs para abrir a porta. E NÃO toque em nada. Tá. Toque em uma coisa.

**Requisito:** Reúna Runa Anã ×5 (`material · runa_ana · 5`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Não levar nada e selar o cofre de novo**<br>`cofre_selar` | Os reis anões dormem em paz. Borin tira o chapéu, coisa rara. | +1 Vigor · título "Guardião do Cofre" | entrega Runa Anã ×5 |
| **Levar o ouro dos reis**<br>`cofre_ouro` | Ouro antigo pesa mais, na mochila e na consciência. Borin nunca mais te empresta a bigorna boa. | +120 de ouro | −3% de sucesso na Forja |
| **Levar o fragmento da Coroa Partida**<br>`cofre_coroa` | O fragmento é frio e sussurra. Você finge que não escuta. | +2 de dano contra chefes | −5% de resistência a sombra |


### Ato 3 · A Cinza e a Capela

#### N13 · Fogo de Segunda Mão
`fogo_de_segunda_mao` · Pico de Ignaris · fala: **Ophira Vane** · vem de: forja_runas › Temperar a arma sob a luz rúnica · segue para: N14 (`aco_que_respira`)

> A lava está mais fria do que devia. Medi com o termômetro, com o cotovelo e com um aprendiz. Algo está sugando o calor do vulcão. Isso é terrível! E fascinante! Mas principalmente fascinante.

**Requisito:** Vença 8 combates no Pico de Ignaris (`victories · pico_escarlate · 8`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Ajudar Ophira a medir o calor roubado**<br>`ophira_medir` | Vocês descobrem para onde o calor vai: para baixo, e para o mar. | +10% de resistência a fogo | — |
| **Aceitar o elixir experimental**<br>`ophira_elixir` | Tem gosto de pimenta e de más decisões. Funciona. | +1 de Energia máxima · Óleo de Fogo Ancestral ×2 | — |
| **Comprar a fórmula e virar sócio**<br>`ophira_socio` | Você é oficialmente sócio de uma alquimista. Que os deuses te ajudem. | +15% de cura das poções | −60 de ouro |

#### N14 · Aço que Respira
`aco_que_respira` · Pico de Ignaris · fala: **Cassian Draye** · vem de: N13 · segue para: `chama_escarlate`

> Os draconatos forjam lâminas que respiram fogo. Eu forjo lâminas que respiram inveja. Traga-me o segredo deles e talvez eu te considere digno de carregar uma das minhas. Talvez.

**Requisito:** Derrote um chefe do Pico de Ignaris (`region · pico_escarlate · 1`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Aprender a técnica com os próprios draconatos**<br>`cassian_aprender` | Cassian finge desdém. Anota tudo. | +5% de sucesso na Forja · +5% de resistência a fogo | — |
| **Trocar o segredo por uma arma de Cassian**<br>`cassian_trocar` | A lâmina é perfeita. O discurso que vem junto, nem tanto. | +1 de ataque | — |
| **Vencer Cassian num duelo pelo segredo**<br>`cassian_duelar` | Cassian perde. E conta para todos que ganhou. | +3% de crítico · título "Quem Venceu Cassian" | — |

#### N15 · A Fênix que Não Queria Voltar
`fenix_presa` · Pico de Ignaris · fala: **Alaric Thorne** · vem de: chama_escarlate · segue para: N16 (`tesouro_de_ignaroth`)

> A Fênix do Sol Morto renasce presa! Cada vez mais escura, mais triste, mais... trágica! Como eu, na primavera de 12! Só uma armadura minha, minha obra-prima, sobreviveria às chamas dela!

**Requisito:** Derrote 4 chefes do Pico de Ignaris (`region · pico_escarlate · 4`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Libertar a Fênix do ciclo**<br>`fenix_libertar` | Ela voa para longe e deixa uma pena como agradecimento. Alaric chora, como sempre. | Elixir da Fênix ×1 · +5 de vida máxima | — |
| **Deixar Alaric forjar com as cinzas dela**<br>`fenix_armadura` | A armadura é linda. Alaric também acha, em voz alta, por uma hora. | +1 Vigor · +5% de resistência a fogo | — |
| **Estudar o renascimento da Fênix**<br>`fenix_estudar` | Você não aprende a voltar da morte. Aprende a demorar mais para ir. | +1 Bênção de Proteção · +10% de carga do Golpe Supremo | — |

#### N16 · O Tesouro de Ignaroth
`tesouro_de_ignaroth` · Pico de Ignaris · fala: **Ignaroth** · vem de: N15 · segue para: N21 (`porteiro_do_fim`)

> Pequeno campeão. Entre as minhas escamas há ouro de dez reinos e uma única pergunta: o que você fará quando o Sol Negro cair? Escolha o que levar. Eu saberei o que você é.

**Requisito:** Reúna Escama Rubra ×6 (`material · escama_rubra · 6`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Não levar nada e partir**<br>`ignaroth_nada` | O dragão ri, e a montanha treme de respeito. | +2 de dano contra chefes · título "Respeitado por Ignaroth" | — |
| **Levar ouro de dragão**<br>`ignaroth_ouro` | Ouro de dragão nunca acaba. Só acaba quem o carrega. | +150 de ouro · +5% de ouro por vitória | — |
| **Pedir uma escama do próprio dragão**<br>`ignaroth_escama` | Ignaroth arranca uma escama e a entrega. Dói nele. Ele não demonstra. | +8 de vida máxima · +5% de resistência a fogo | — |

#### N17 · Os Mortos Não Pagam Aluguel
`mortos_nao_pagam_aluguel` · Terras de Morvath · fala: **Gideon Mascarado** · vem de: forja_runas › Usar um fragmento sombrio · segue para: N18 (`prefeito_sem_face`)

> As brocas abriram as catacumbas e agora os mortos passeiam pela vila como se fossem donos. Tecnicamente, eram. Tenho três relíquias que acalmam fantasmas. Uma funciona. Quer apostar qual?

**Requisito:** Vença 8 combates nas Terras de Morvath (`victories · terras_mortas · 8`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Exigir que Gideon diga qual relíquia funciona**<br>`gideon_verdade` | Ele diz. Você acha que ele mentiu. Não mentiu. Isso te incomoda mais. | +10% de resistência a sombra | — |
| **Comprar as três relíquias**<br>`gideon_tres` | Uma funciona. As outras duas atraem coisas que deixam bom espólio. | +5% de chance de espólio · Antídoto Real ×2 | −80 de ouro |
| **Furtar as relíquias enquanto ele fala**<br>`gideon_furtar` | Gideon percebe. Gideon sorri. Os mercadores passam a te cobrar "taxa de confiança". | +5% de ouro por vitória | +5% nos preços da Loja |

#### N18 · O Prefeito Sem Face
`prefeito_sem_face` · Terras de Morvath · fala: **Padre Lucian** · vem de: N17 · segue para: `mortos_falam`

> Na Vila dos Sem-Rosto, as pessoas esqueceram os próprios nomes. Eu anoto cada um que lembram, num livro. O livro está quase vazio. Escolha como devolveremos o que lhes foi tirado.

**Requisito:** Derrote um chefe das Terras de Morvath (`region · terras_mortas · 1`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Devolver os nomes, um por um**<br>`lucian_nomes` | Leva a noite inteira. De manhã, alguém te chama pelo seu, e você percebe o quanto sentia falta. | +6 de vida máxima | — |
| **Usar a máscara do Prefeito para enganar os mortos**<br>`lucian_mascara` | Os mortos te ignoram. Os vivos também. É estranhamente relaxante. | +3% de esquiva | — |
| **Levar o livro dos nomes para estudo**<br>`lucian_livro` | Nomes têm poder, e você agora sabe como os mortos de Morvath se chamam. | +10% de dano nas Terras de Morvath · +2% de crítico | — |

#### N19 · Os Selos Rompidos
`selos_rompidos` · Terras de Morvath · fala: **Padre Lucian** · vem de: mortos_falam · segue para: N20 (`quem_paga_os_necromantes`)

> As brocas não romperam os selos por acidente. Alguém sabia onde cavar. Os selos podem ser refeitos com fé ou com ferro. O ferro é mais barato. Também é o que menos dura.

**Requisito:** Derrote 3 chefes das Terras de Morvath (`region · terras_mortas · 3`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Refazer os selos com uma vigília**<br>`selos_vigilia` | Uma noite inteira de orações. Seus joelhos nunca vão perdoar. | +10% de resistência a sombra · +1 Bênção de Proteção | — |
| **Soldar os selos com minério da serra**<br>`selos_ferro` | Resiste por uma geração. Depois é problema de outra geração. | +1 Vigor | entrega Minério Cinzento ×4 |
| **Deixar um selo aberto para ver o que sai**<br>`selos_abrir` | O que sai é grande, zangado e deixa muito espólio. E continua saindo. | +6% de chance de espólio | inimigos das Terras de Morvath com +10% de vida |

#### N20 · Quem Paga os Necromantes
`quem_paga_os_necromantes` · Terras de Morvath · fala: **Gideon Mascarado** · vem de: N19 · segue para: N21 (`porteiro_do_fim`)

> Encontrei os livros de contas da Torre. Os necromantes recebiam em latão, de gente de terno, do outro lado do mar. Eu sei: "Gideon, você também recebe de qualquer um". Mas eu tenho padrão. Baixo, mas tenho.

**Requisito:** Derrote 4 chefes das Terras de Morvath (`region · terras_mortas · 4`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Entregar o livro de contas à Guilda**<br>`contas_guilda` | Brenna manda um bilhete: "bom trabalho". Emoldure. Não vai acontecer de novo. | +10% de reputação na Guilda · título "Auditor de Morvath" | — |
| **Chantagear os contadores da Torre**<br>`contas_chantagem` | O dinheiro chega pontualmente, todo mês, junto com olhares assassinos. | +8% de ouro por vitória | — |
| **Queimar a Torre com os livros dentro**<br>`contas_queimar` | Nada de provas, nada de necromantes, uma fogueira ótima. | +1 de ataque · +5% de resistência a sombra | — |


### Ato 4 · O Rasgo do Sol Negro

#### N21 · O Porteiro do Fim do Mundo
`porteiro_do_fim` · Reino do Sol Negro · fala: **Oráculo Danika** · vem de: N16 · N20 · segue para: N22 (`o_que_vaelora_viu`)

> Os portões abrem para quem tem algo a perder. Você tem. Por isso vai hesitar. Não hesite. Escolha o que deixar para trás antes de entrar; lá dentro, ele escolhe por você.

**Requisito:** Vença 8 combates no Reino do Sol Negro (`victories · coracao_eclipse · 8`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Deixar para trás o ouro**<br>`portao_ouro` | Mais leve, você anda mais rápido. E sente menos falta do que imaginava. | +1 Destreza · +2% de esquiva | −100 de ouro |
| **Deixar para trás o medo**<br>`portao_medo` | Danika assente. É o máximo de emoção que ela demonstra num ano. | +3% de crítico · +10% de carga do Golpe Supremo | — |
| **Deixar para trás o próprio nome**<br>`portao_nome` | Ninguém lá dentro saberá como te chamar. Nem para te amaldiçoar. | +10% de resistência a arcano · +5% de resistência a sombra | — |

#### N22 · O Que Vaelora Viu
`o_que_vaelora_viu` · Reino do Sol Negro · fala: **Vaelora, Senhora do Véu** · vem de: N21 · segue para: N23 (`cronista_do_fim`)

> Eu vi os cabos, campeão. Descem do céu do outro lado do mar e bebem daqui. Malgor não é a doença; é só a febre. Quer a cura ou quer a vingança? Não há tempo para as duas.

**Requisito:** Derrote 2 chefes do Reino do Sol Negro (`region · coracao_eclipse · 2`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Buscar a cura: rastrear os cabos**<br>`veu_cura` | Você marca no mapa de onde vêm os cabos. Um mar inteiro de distância. | +5% de XP · título "Rastreador dos Cabos" | — |
| **Buscar a vingança: estudar Malgor**<br>`veu_vinganca` | Vaelora sorri, triste. "Todos escolhem isso." | +10% de dano no Reino do Sol Negro · +1 de dano contra chefes | — |
| **Mentir para Vaelora e tentar as duas**<br>`veu_mentir` | Ela sabe que você mentiu. Te deixa ir mesmo assim, por curiosidade. | +5% de ouro por vitória · +5% de chance de espólio | — |

#### N23 · O Cronista do Fim
`cronista_do_fim` · Reino do Sol Negro · fala: **Cronista do Fim** · vem de: N22 · segue para: `coracao`

> Este arquivo guarda todos os finais possíveis. Na maioria deles você morre. Em alguns, pior: você vence e ninguém lembra. Escolha uma página para rasgar.

**Requisito:** Derrote 3 chefes do Reino do Sol Negro (`region · coracao_eclipse · 3`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Rasgar a página em que você morre**<br>`arquivo_morte` | Uma morte a menos no mundo. Pelo menos no papel. | +2 Bênçãos de Proteção · +5 de vida máxima | — |
| **Rasgar a página em que ninguém lembra de você**<br>`arquivo_esquecido` | Seu nome será cantado. Desafinado, mas cantado. | título "Lembrado pelas Eras" · +10% de reputação na Guilda · +5% de ouro por vitória | — |
| **Rasgar a página em que Malgor vence**<br>`arquivo_malgor` | O arquivo estremece. Algumas páginas pegam fogo sozinhas. | +2 de dano contra chefes · +2% de crítico | — |


### Ato 5 · A Grande Travessia

#### N24 · Carga Não Declarada
`carga_nao_declarada` · Cumes de Frostgard · fala: **Capitã Vanya** · vem de: epilogo_luz · epilogo_sombra · segue para: N25 (`flores_de_cobre`)

> Minhas perfuratrizes carregam o que o manifesto diz. O manifesto diz "minério". O minério grita à noite. Não é problema meu. Agora é seu.

**Requisito:** Vença 8 combates nos Cumes de Frostgard (`victories · frostgard · 8`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Abrir a carga e libertar o que grita**<br>`vanya_abrir` | É um espírito da floresta de Havendown, engarrafado. Ele agradece com o único presente que tem. | +8 de vida máxima · +5% de resistência a gelo | — |
| **Escoltar a carga sem perguntas**<br>`vanya_escoltar` | Vanya paga o combinado e nem um cobre a mais. E passa a te respeitar por isso. | +200 de ouro · +5% de ouro por vitória | — |
| **Desviar a carga para a Rebelião**<br>`vanya_desviar` | Maeve fica sabendo e te ensina os atalhos. Os guardas de Vanya também ficam sabendo. | +5% de XP | inimigos dos Cumes de Frostgard com +10% de vida |

#### N25 · Flores de Cobre
`flores_de_cobre` · Bosque de Engrenverde · fala: **Garrick Engrenafolha** · vem de: N24 · segue para: N26 (`greve_nos_trilhos`)

> Eu ensinei uma rosa a girar engrenagens! Ela gira! Ela também morde, mas é detalhe de projeto. O problema: a seiva que eu uso vem de Havendown. Pelo cano. Roubada. Ai.

**Requisito:** Reúna Seiva Encanada ×6 (`material · seiva_encanada · 6`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Convencer Garrick a cultivar seiva própria**<br>`garrick_cultivar` | Demora anos, mas as poções da estufa são as melhores do continente. | +10% de cura das poções · +5 de vida máxima | entrega Seiva Encanada ×6 |
| **Levar um enxerto de rosa-engrenagem**<br>`garrick_enxerto` | Ela vive na sua mochila e às vezes corta quem chega perto demais. | +2% de crítico · +2% de esquiva | — |
| **Registrar a patente no nome dos dois**<br>`garrick_patente` | Chegam royalties de cada estufa de Steelmere. Garrick nunca leu o contrato. | +8% de ouro por vitória | — |

#### N26 · Greve nos Trilhos
`greve_nos_trilhos` · Campos de Trilhouro · fala: **Maeve Faísca** · vem de: N25 · segue para: N27 (`caldeira_no_vermelho`)

> Os trens param amanhã! Todos! Se o Sindicato quiser grão, que venha buscar a pé! Você está com a gente ou com o Inspetor Sterling? E não diga "depende". Ninguém nunca ganhou uma revolução com "depende".

**Requisito:** Derrote 2 chefes dos Campos de Trilhouro (`region · trilhouro · 2`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Apoiar a greve nos piquetes**<br>`greve_apoiar` | Os trabalhadores cantam seu nome. Mal, mas cantam. | +1 Vigor · título "Voz dos Trilhos" | — |
| **Mediar um acordo com Silas Sterling**<br>`greve_mediar` | Ninguém sai feliz. Por isso mesmo funciona, e os comerciantes te agradecem. | 10% de desconto na Loja | — |
| **Escoltar os trens do Sindicato**<br>`greve_furar` | O Sindicato paga muito bem. Os grevistas de Trilhouro nunca mais te deixam em paz. | +250 de ouro · +5% de chance de espólio | inimigos dos Campos de Trilhouro com +10% de vida |


### Ato 6 · A Fornalha dos Esquecidos

#### N27 · A Caldeira no Vermelho
`caldeira_no_vermelho` · Caldeira de Vulcannis · fala: **Mestre Ignatius Drake** · vem de: N26 · segue para: N28 (`os_que_foram_desligados`)

> O ponteiro da pressão passou do vermelho, entrou no "vermelho-escuro" e agora está num tom que eu chamo de "ops". Podemos aliviar, sabotar ou vender ingressos para a explosão.

**Requisito:** Reúna Escória Vulcânica ×8 (`material · escoria_vulcanica · 8`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Aliviar as válvulas com Ignatius**<br>`caldeira_aliviar` | A cidade dorme tranquila, sem saber que quase acordou em órbita. | +10% de resistência a fogo · +5 de vida máxima | — |
| **Sabotar a caldeira do Sindicato**<br>`caldeira_sabotar` | O dreno de Havendown engasga por uma semana. Do outro lado do mar, alguém respira melhor. | +1 de ataque · +10% de carga do Golpe Supremo | — |
| **Vender ingressos para "a quase explosão"**<br>`caldeira_ingressos` | Ignatius adora a ideia. A caldeira, não. | +300 de ouro · +3% de ouro por vitória | — |

#### N28 · Os Que Foram Desligados
`os_que_foram_desligados` · Charco de Ferrujal · fala: **Unidade 73** · vem de: N27 · segue para: N29 (`baile_do_magnata`)

> UNIDADE 73. ESTADO: DESLIGADA. EXCETO QUE NÃO. Os outros não acordam. Eu acordei porque alguém esqueceu de apagar minha memória. Você pode religá-los, desmontá-los ou deixar que eu decida. Aviso: eu decido mal.

**Requisito:** Derrote 2 chefes do Charco de Ferrujal (`region · ferrujal · 2`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Religar os autômatos esquecidos**<br>`automatos_religar` | Mil olhos de vidro se acendem. Alguns agradecem. Outros ainda estão pensando. | +1 Vigor · +2% de esquiva | — |
| **Desmontar os autômatos por peças**<br>`automatos_desmontar` | Peças raras, zero perguntas. A Unidade 73 anota seu nome num arquivo chamado "depois". | Fragmento Físico ×8 · Essência Mágica ×6 · +5% de sucesso na Forja | — |
| **Deixar a Unidade 73 decidir**<br>`automatos_73` | Ela decide te seguir. Você não sabe se é lealdade ou estudo de campo. | +10% de carga do Golpe Supremo · +3% de crítico | — |


### Ato 7 · O Pulso de Dois Mundos

#### N29 · O Baile do Magnata
`baile_do_magnata` · Cidade de Coroferro · fala: **Lorde Hamilton Cross** · vem de: N28 · segue para: N30 (`consciencia_no_reator`)

> Um herói de Havendown no meu baile! Que exótico! Sente-se, coma algo que custa mais que a sua armadura e me diga: o que um homem como eu precisa fazer para ter você do lado certo da história? O lado certo é o meu, naturalmente.

**Requisito:** Reúna Engrenagem Real ×6 (`material · engrenagem_real · 6`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Recusar o convite e expor Hamilton**<br>`baile_expor` | O baile acaba em escândalo. A Dra. Elian Vance te passa um bilhete: "obrigada. corre." | +5% de XP · +5% de resistência a arcano | — |
| **Aceitar o patrocínio de Hamilton**<br>`baile_patrocinio` | Seu equipamento nunca foi tão bem polido. Sua reputação na Guilda, nunca tão manchada. | +400 de ouro · 10% de desconto na Loja | −10% de reputação na Guilda |
| **Fingir aceitar e roubar as plantas do reator**<br>`baile_espionar` | Você sai do baile com um canapé e as plantas do Núcleo de Aetherium. | +10% de dano no Núcleo de Aetherium · +5% de chance de espólio | — |

#### N30 · A Consciência no Reator
`consciencia_no_reator` · Núcleo de Aetherium · fala: **Corvin Vane** · vem de: N29 · segue para: `epilogo_dois_mundos`

> O reator pensa. Sente. Implora, em linguagem de pressão e temperatura. A decisão final vem depois, na calibração. Esta é outra: quem você leva consigo até lá em cima.

**Requisito:** Derrote 3 chefes do Núcleo de Aetherium (`region · aetherium · 3`)

| Escolha | Consequência (texto no jogo) | Efeito | Custo |
|---|---|---|---|
| **Levar os aliados de Steelmere**<br>`reator_aliados` | Maeve, Vanya, Garrick, até Ignatius. Ninguém sobe sozinho a escada do fim. | +10 de vida máxima · +1 Bênção de Proteção | — |
| **Subir sozinho**<br>`reator_sozinho` | O silêncio é total. Você ouve o reator chorar, e isso te dá uma raiva útil. | +1 de ataque · +3% de crítico | — |
| **Conversar com o reator antes de tudo**<br>`reator_conversar` | Ele não responde com palavras. Responde abrindo uma porta. | +10% de resistência a arcano · +10% de carga do Golpe Supremo | — |

## 5. Tetos e máximos por caminho

A coluna "máximo" supõe um jogador que, em todo capítulo do caminho, escolhe sempre a opção com aquele bônus (os 16 caminhos foram percorridos; vale o maior). Quem diversifica fica bem abaixo. O teto é aplicado na soma de todos os efeitos de história; quando corta, o botão da escolha avisa "teto atingido". Os valores do teto são o ponto de ajuste depois de `npm run test:balance`.

Caminhos possíveis: **16**. Capítulos novos por caminho: 24 (de 30).

| Bônus | Máximo num único caminho (escolhendo sempre esse bônus) | Teto proposto | Situação |
|---|---|---|---|
| Ataque | 9 | 6 | teto corta |
| Dano contra chefes | 11 | 6 | teto corta |
| Crítico (%) | 25 | 10 | teto corta |
| Dano no Núcleo de Aetherium (%) | 10 | 20 | cabe |
| Dano no Reino do Sol Negro (%) | 20 | 20 | cabe |
| Dano nas Terras de Morvath (%) | 10 | 20 | cabe |
| Destreza | 1 | 2 | cabe |
| Energia máxima | 1 | 2 | cabe |
| Esquiva (%) | 13 | 6 | teto corta |
| Forja (%) | 33 | 20 | teto corta |
| Reputação na Guilda (%) | 35 | 25 | teto corta |
| Desconto na Loja (%) | 25 | 15 | teto corta |
| Masmorras (%) | 10 | 20 | cabe |
| Material extra na Floresta de Abdendriel (%) | 15 | 30 | cabe |
| Material extra na Serra de Kaldrum (%) | 15 | 30 | cabe |
| Ouro por vitória (%) | 64 | 35 | teto corta |
| Cura das poções (%) | 45 | 30 | teto corta |
| Resistência a arcano (%) | 33 | 25 | teto corta |
| Resistência a fogo (%) | 35 | 25 | teto corta |
| Resistência a gelo (%) | 13 | 25 | cabe |
| Resistência a sombra (%) | 50 | 25 | teto corta |
| Espólio (%) | 34 | 20 | teto corta |
| Golpe Supremo (%) | 50 | 25 | teto corta |
| Vida máxima | 62 | 40 | teto corta |
| Vigor | 7 | 6 | teto corta |
| XP (%) | 24 | 15 | teto corta |

## 6. Ajustes nos capítulos que já existem

### Efeitos para as escolhas que hoje não fazem nada, e textos que prometiam o que não acontecia

| Capítulo › escolha | Hoje | Proposta |
|---|---|---|
| `prologo` › Jurar proteção (`juramento`) | +8 de ouro; "a Guilda reconhecerá sua honra" não faz nada | +8 de ouro · +5% de reputação na Guilda |
| `prologo` › Exigir pagamento (`pagamento`) | +18 de ouro, +10% de ouro por vitória; "rota mais perigosa" não é verdade | Mesmo efeito. Texto novo: "Você obtém recursos e segue a trilha do dinheiro até um informante suspeito." |
| `sinais_lua` › Entregar a seiva (`ritual`) | +5% de Forja; não entrega nada | +5% de Forja · **entrega 3 Seiva Lunar** (agora "entregar" é verdade) |
| `sinais_lua` › Guardar a seiva (`guardar`) | Nada; "preserva materiais" era falso porque o ritual não gastava | Continua sem bônus, mas agora preserva de fato as 3 Seivas. Leva ao predador, como hoje |
| `mercenario` › Vender cópia (`vender`) | +28 de ouro, +10% de ouro; "floresta mais hostil" não fazia nada | Mesmo efeito · **inimigos da Floresta de Abdendriel com +10% de vida** |
| `predador_lunar` › Poupar (`poupar`) | Nada; "a floresta concede sua bênção" | +1 Bênção de Proteção · +4 de vida máxima |
| `forja_runas` › Fragmento sombrio (`sombra`) | Nada (a luz dá +1 de Vigor) | +3% de crítico |
| `chama_escarlate` › Duelo (`duelo`) | Nada; "Ignaroth respeita sua coragem" | +2 de dano contra chefes |
| `chama_escarlate` › Roubar a tabuleta (`roubo`) | +1 de ataque; "conquista um inimigo" não fazia nada | +1 de ataque · **inimigos do Pico de Ignaris com +10% de vida** |
| `mortos_falam` › Ouvir a profecia (`ouvir`) | Nada; "você conhece a fraqueza de Malgor" | +10% de dano no Reino do Sol Negro |
| `mortos_falam` › Romper o ritual (`romper`) | +15 de ouro; "evita a maldição" não fazia nada | +15 de ouro · +10% de resistência a sombra |

Os bônus que já existem continuam iguais (`pagamento`, `vender`: +10% de ouro; `trofeu`: +8% de espólio; `guilda`, `ritual`: +5% de Forja; `luz`, `selar`: +1 de Vigor; `roubo`: +1 de ataque; `tomar`: +2 de ataque). Uma diferença: hoje `tomar` e `roubo` não somam (vale o maior); na proposta tudo soma e o teto corta.

### Novos destinos (`next`) das escolhas atuais

- `prologo`: `juramento` › `agua_que_brilha` (N01) · `pagamento` › `carga_sem_dono` (N03)
- `sinais_lua` › `ritual` e `mercenario` › `guilda` › `diplomacia_goblin` (N05). `guardar` e `vender` continuam indo para `predador_lunar`.
- `predador_lunar` (as duas escolhas) › `diplomacia_goblin` (N05)
- `forja_runas`: `luz` › `fogo_de_segunda_mao` (N13) · `sombra` › `mortos_nao_pagam_aluguel` (N17)
- `chama_escarlate` (as duas) › `fenix_presa` (N15) · `mortos_falam` (as duas) › `selos_rompidos` (N19)
- `epilogo_luz` e `epilogo_sombra` ganham um único botão "Atravessar o mar", sem efeito e fora da conta das 90, que leva a `carga_nao_declarada` (N24).
- Capítulo final novo `epilogo_dois_mundos`, sem escolhas: fecha a Crônica depois de N30. O texto depende do final decidido na missão de Steelmere (`endingFromFlags`), com uma versão para cada um dos 3 finais.

### Requisitos que precisam subir

Com capítulos novos antes deles, estes ficariam cumpridos no instante em que abrem:

| Capítulo | Hoje | Proposta |
|---|---|---|
| `mercenario` | 1 chefe no total | 2 chefes no total |
| `forja_runas` | 1 item aprimorado | 2 itens aprimorados |
| `chama_escarlate` | 3 chefes no total | 2 chefes do Pico de Ignaris (`region · pico_escarlate · 2`) |
| `coracao` | 1 chefe do Sol Negro | 4 chefes do Sol Negro (N23 pede 3) |

## 7. Plano de implementação

1. **Dados.** `StoryChoice` ganha `effects` e `costs` tipados, no lugar dos campos soltos `gold` e `material`. Os 30 capítulos entram em `STORY_CHAPTERS` com os mesmos ids deste documento.
2. **Motor.** `storyModifiers` deixa de ter ids de escolha escritos no código: soma os `effects` das escolhas feitas (`storyChoices`) e corta nos tetos da seção 5. `chooseStory` aplica efeitos imediatos e custos, e recusa a escolha quando o custo não pode ser pago.
3. **Ganchos novos** do catálogo (seção 3), um por vez, cada um com teste.
4. **Tela.** Cada botão de escolha mostra os efeitos (verde) e os custos (vermelho). O botão fica desabilitado, com o motivo, quando falta ouro ou material, e mostra "teto atingido" quando o bônus já está no máximo. A aba História ganha um resumo "O que sua história te deu até agora".
5. **Testes de dados.** Ids únicos, todo `next` existe, 3 escolhas por capítulo, tokens válidos, e o mesmo passeio pelos 16 caminhos usado para gerar a tabela da seção 5.
6. **Balanceamento.** Rodar `npm run test:balance` antes e depois; os tetos são o botão de ajuste.

### Cuidados

- **`worldUnlocked` depende hoje de `storyChapterId` ser um epílogo.** Quando a Crônica seguir para Steelmere, o capítulo atual passa a ser N24 ou além e Steelmere trancaria. Trocar por "escolheu `selar` ou `tomar`" (`storyChoices.coracao`).
- **Saves em andamento.** Quem já passou de um ponto da história não volta para os capítulos novos anteriores; segue do capítulo onde está, e o `next` novo o leva aos capítulos seguintes. Quem está num epílogo recebe o botão "Atravessar o mar". Escolhas antigas mantêm os mesmos bônus.
- **Coop.** Verificar se o combate cooperativo usa `storyModifiers`; se não usar, os bônus de história valem só no solo, e isso precisa ser uma decisão, não um acidente.
- **Cristais.** Cada capítulo concluído dá 5 Cristais de Éter; um caminho completo dá 120 a mais.
- **Arte.** Os capítulos novos podem usar a arte da região como padrão; 30 cenas próprias seriam um pedido para o Codex (fila ART-XXX).
