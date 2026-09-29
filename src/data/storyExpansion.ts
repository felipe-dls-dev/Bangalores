import type { StoryChapter } from './expansion'
import { fx } from './storyEffects'

// Os 30 capítulos da expansão das Crônicas (N01 a N30 em docs/STORY_CHOICES_EXPANSION.md, onde estão o mapa da
// campanha, o catálogo de efeitos e os tetos). Cada escolha lista seus efeitos com o vocabulário de storyEffects.ts.
// Os destinos dos capítulos que já existiam (prólogo, epílogos etc.) apontam para cá em expansion.ts.
export const STORY_EXPANSION_CHAPTERS: StoryChapter[] = [
  // ---------- Ato 1 ----------
  // N01
  {
    id: 'agua_que_brilha', act: 1, title: 'Água que Brilha', speaker: 'Sela Hartwin', region: 'Planícies de Alvora',
    dialogue: 'O poço de Valedouro está brilhando. Brilhando! Água não brilha, a não ser que esteja muito feliz ou muito envenenada, e ninguém em Valedouro anda feliz. Me ajuda a decidir o que fazer antes que alguém beba e comece a enxergar no escuro.',
    requirement: { type: 'victories', target: 'campos_dourados', amount: 8, label: 'Vença 8 combates nas Planícies de Alvora' },
    choices: [
      { id: 'poco_filtrar', text: 'Filtrar o poço com carvão e fibra', next: 'espantalho_de_valedouro', consequence: 'O poço volta a servir, e Sela aprende a destilar remédio com a água limpa.', effects: fx('pocao:10', 'item:pocao_cura:2') },
      { id: 'poco_engarrafar', text: 'Engarrafar a água brilhante e vender como tônico', next: 'espantalho_de_valedouro', consequence: 'O ouro é real. A desconfiança dos boticários também.', effects: fx('ouro:30', 'loja:5') },
      { id: 'poco_estudar', text: 'Levar uma amostra da névoa ciana para estudar', next: 'espantalho_de_valedouro', consequence: 'Você entende a febre o bastante para ter medo com precisão.', effects: fx('res:arcano:8') },
    ],
  },
  // N02
  {
    id: 'espantalho_de_valedouro', act: 1, title: 'O Barão de Palha', speaker: 'Colm Aldric', region: 'Planícies de Alvora',
    dialogue: 'O Barão Espantalho está usando a MINHA armadura. A que eu perdi. Tá, "perdi" é forte: eu esqueci num campo. Ele levantou, vestiu e agora protege a plantação de todo mundo, inclusive dos donos.',
    requirement: { type: 'bosses', amount: 1, label: 'Derrote um chefe' },
    choices: [
      { id: 'barao_devolver', text: 'Devolver a armadura a Colm, amassada e tudo', next: 'sinais_lua', consequence: 'Colm chora. Depois cobra menos de você. Depois chora de novo.', effects: fx('loja:-5') },
      { id: 'barao_desmontar', text: 'Desmontar a armadura e aproveitar as peças', next: 'sinais_lua', consequence: 'Colm finge que não viu. A Forja agradece o metal encantado.', effects: fx('mat:fragmento_fisico:4', 'forja:3') },
      { id: 'barao_vestir', text: 'Ficar com o peitoral encantado de palha', next: 'sinais_lua', consequence: 'Coça. Mas nenhum corvo te bica desde então.', effects: fx('vigor:1') },
    ],
  },
  // N03
  {
    id: 'carga_sem_dono', act: 1, title: 'Carga Sem Dono', speaker: 'Toby Harlan', region: 'Planícies de Alvora',
    dialogue: 'Um comboio de remédios foi atacado na Ponte de Eldrimar e metade da carga ainda está lá, SEM DONO! Quer dizer, com dono. Com dono morto. O que tecnicamente é "sem dono", certo? Certo?! Diz que é certo.',
    requirement: { type: 'victories', target: 'campos_dourados', amount: 8, label: 'Vença 8 combates nas Planícies de Alvora' },
    choices: [
      { id: 'carga_devolver', text: 'Levar os remédios de volta à vila', next: 'selos_de_latao', consequence: 'Toby suspira como quem perdeu um amor. O padre da vila te abençoa.', effects: fx('bencao:1', 'item:pocao_cura:1') },
      { id: 'carga_revender', text: 'Revender a carga no mercado paralelo', next: 'selos_de_latao', consequence: 'Lucro rápido. Os bandoleiros de Alvora descobrem quem ficou com o que era deles.', effects: fx('ouro:45', 'hostil:campos_dourados:10') },
      { id: 'carga_laminas', text: 'Ficar com as lâminas do comboio', next: 'selos_de_latao', consequence: 'Toby afia o fio de graça. "Propaganda", ele diz.', effects: fx('crit:3') },
    ],
  },
  // N04
  {
    id: 'selos_de_latao', act: 1, title: 'Selos de Latão', speaker: 'Brenna Ashcombe', region: 'Planícies de Alvora',
    dialogue: 'Os bandoleiros usam ferramentas com selos de latão que nenhuma forja nossa sabe fazer. Traga fibra dourada para eu amarrar essas provas num relatório que alguém da capital vai fingir que leu.',
    requirement: { type: 'material', target: 'fibra_dourada', amount: 4, label: 'Reúna Fibra Dourada ×4' },
    choices: [
      { id: 'latao_relatorio', text: 'Entregar as provas à Guilda', next: 'mercenario', consequence: 'Brenna lê o relatório inteiro. Isso nunca tinha acontecido.', effects: fx('guilda:10', 'custoMat:fibra_dourada:4') },
      { id: 'latao_derreter', text: 'Derreter os selos e vender o latão', next: 'mercenario', consequence: 'Ouro no bolso, pista no fundo do rio.', effects: fx('ouro:35') },
      { id: 'latao_ferreiro', text: 'Levar um selo para o ferreiro estudar', next: 'mercenario', consequence: 'Borin vai odiar. E vai aprender.', effects: fx('forja:5') },
    ],
  },
  // ---------- Ato 2 ----------
  // N05
  {
    id: 'diplomacia_goblin', act: 2, title: 'A Diplomacia dos Goblins', speaker: 'Kip Pé-Ligeiro', region: 'Floresta de Abdendriel',
    dialogue: 'Os goblins da clareira querem conversar. Com você. Eu vou ficar aqui atrás dessa árvore dando apoio moral. De longe. Se eles gritarem, é normal. Se eles sorrirem, corre.',
    requirement: { type: 'region', target: 'floresta_lunargenta', amount: 1, label: 'Derrote um chefe da Floresta de Abdendriel' },
    choices: [
      { id: 'goblins_tregua', text: 'Negociar uma trégua: estradas livres, clareira deles', next: 'reflexo_que_mente', consequence: 'Os goblins cumprem o acordo e deixam seiva na sua fogueira. Quase sempre. Às terças, não.', effects: fx('matExtra:floresta_lunargenta:15') },
      { id: 'goblins_expulsar', text: 'Expulsar o bando da clareira', next: 'reflexo_que_mente', consequence: 'A clareira fica em silêncio. Os goblins ficam com rancor, e têm boa memória.', effects: fx('ataque:1', 'hostil:floresta_lunargenta:10') },
      { id: 'goblins_contratar', text: 'Contratar os goblins como batedores', next: 'reflexo_que_mente', consequence: 'Eles aceitam pagamento em botões e avisam de cada emboscada.', effects: fx('esquiva:2', 'custoOuro:20') },
    ],
  },
  // N06
  {
    id: 'reflexo_que_mente', act: 2, title: 'O Reflexo que Mente', speaker: 'Mestra Lyriel', region: 'Floresta de Abdendriel',
    dialogue: 'O Lago do Espelho mostra quem você será. Ontem me mostrou velha e cercada de gatos; sorri por uma semana. Hoje ele mostra outra coisa: o Sol Negro, refletido onde deveria haver lua.',
    requirement: { type: 'victories', target: 'floresta_lunargenta', amount: 10, label: 'Vença 10 combates na Floresta de Abdendriel' },
    choices: [
      { id: 'espelho_encarar', text: 'Encarar o reflexo até o fim', next: 'raizes_que_choram', consequence: 'Você vê o que te espera. E decide que não vai ser assim.', effects: fx('res:sombra:10') },
      { id: 'espelho_quebrar', text: 'Quebrar o espelho com a arma', next: 'raizes_que_choram', consequence: 'Sete anos de azar? Lyriel diz que é lenda. Lyriel também conversa com musgo.', effects: fx('crit:3', 'saque:-3') },
      { id: 'espelho_colher', text: 'Colher a água do espelho para as poções', next: 'raizes_que_choram', consequence: 'Poções com gosto de luar e um leve arrependimento.', effects: fx('pocao:10') },
    ],
  },
  // N07
  {
    id: 'raizes_que_choram', act: 2, title: 'As Raízes que Choram', speaker: 'A Árvore Anciã', region: 'Floresta de Abdendriel',
    dialogue: 'Pequeno ser de carne. Algo bebe da minha seiva por baixo da terra: tubos frios, que zumbem. Eu não sei o que é "latão". Sei que dói.',
    requirement: { type: 'region', target: 'floresta_lunargenta', amount: 3, label: 'Derrote 3 chefes da Floresta de Abdendriel' },
    choices: [
      { id: 'raizes_curar', text: 'Selar os tubos e curar as raízes', next: 'neve_com_gosto_de_oleo', consequence: 'A floresta respira. Um galho toca seu ombro com cuidado de avó.', effects: fx('vida:6') },
      { id: 'raizes_seguir', text: 'Seguir os tubos até a origem', next: 'neve_com_gosto_de_oleo', consequence: 'Os tubos descem para o norte, rumo às montanhas. A pista vale mais que a bênção.', effects: fx('xp:5') },
      { id: 'raizes_arrancar', text: 'Arrancar um tubo inteiro como prova', next: 'neve_com_gosto_de_oleo', consequence: 'A Árvore geme. O metal é estranho, leve e ensina muito ao ferreiro.', effects: fx('mat:fragmento_fisico:3', 'forja:4') },
    ],
  },
  // N08
  {
    id: 'neve_com_gosto_de_oleo', act: 2, title: 'Neve com Gosto de Óleo', speaker: 'Torvald Barbaneve', region: 'Serra de Kaldrum',
    dialogue: 'Alguém está perfurando MINHA montanha. Sem licença, sem capacete e sem convidar para o almoço! As brocas cantam à noite. Meus mineiros já estão aprendendo a letra.',
    requirement: { type: 'victories', target: 'montanhas_cinzentas', amount: 8, label: 'Vença 8 combates na Serra de Kaldrum' },
    choices: [
      { id: 'kaldrum_escoltar', text: 'Escoltar os mineiros até um túnel seguro', next: 'o_ceu_tem_opiniao', consequence: 'Torvald te ensina a sobreviver ao frio da serra e paga em minério.', effects: fx('res:gelo:8', 'mat:minerio_cinzento:3') },
      { id: 'kaldrum_sabotar', text: 'Sabotar as brocas durante a noite', next: 'o_ceu_tem_opiniao', consequence: 'Silêncio na montanha. Os donos das brocas vão notar, e mandar gente.', effects: fx('chefes:1', 'hostil:montanhas_cinzentas:10') },
      { id: 'kaldrum_broca', text: 'Roubar uma broca inteira para Torvald', next: 'o_ceu_tem_opiniao', consequence: 'Torvald a abraça. Literalmente. Por muito tempo.', effects: fx('forja:4', 'ouro:30') },
    ],
  },
  // N09
  {
    id: 'o_ceu_tem_opiniao', act: 2, title: 'O Céu Tem Opinião', speaker: 'Irmã Astrid', region: 'Serra de Kaldrum',
    dialogue: 'As estrelas estão fora do lugar. Não "fora do lugar" poético: fora do lugar tipo alguém as EMPURROU. Sobe comigo ao Cume do Trovão. Se um raio nos atingir, pelo menos vai ser cientificamente interessante.',
    requirement: { type: 'region', target: 'montanhas_cinzentas', amount: 2, label: 'Derrote 2 chefes da Serra de Kaldrum' },
    choices: [
      { id: 'astrid_mapa', text: 'Ajudar Astrid a remapear o céu', next: 'os_que_nao_voltaram', consequence: 'Agora você sabe a hora exata de cada tempestade. E de cada emboscada.', effects: fx('esquiva:2') },
      { id: 'astrid_raio', text: 'Canalizar o raio na sua arma', next: 'os_que_nao_voltaram', consequence: 'Sua arma zumbe. Seu cabelo também, mas isso passa. Talvez.', effects: fx('ataque:1') },
      { id: 'astrid_vender', text: 'Vender a carta celeste ao consulado de Kholgard', next: 'os_que_nao_voltaram', consequence: 'Astrid te chama de "filisteu". Você teve que perguntar o que é.', effects: fx('ouro:60') },
    ],
  },
  // N10
  {
    id: 'os_que_nao_voltaram', act: 2, title: 'Os Que Não Voltaram', speaker: 'Torvald Barbaneve', region: 'Serra de Kaldrum',
    dialogue: 'A Mina dos Anões Caídos tem esse nome por um motivo, e o motivo não é humor. Tem gente minha lá embaixo, ou o que sobrou. Traga minério para escorar os túneis e eu te mostro o caminho.',
    requirement: { type: 'material', target: 'minerio_cinzento', amount: 6, label: 'Reúna Minério Cinzento ×6' },
    choices: [
      { id: 'mina_resgatar', text: 'Resgatar os sobreviventes primeiro', next: 'o_labirinto_tem_senha', consequence: 'Três mineiros voltam para casa. Torvald chora e jura que é poeira.', effects: fx('vida:6', 'bencao:1', 'custoMat:minerio_cinzento:6') },
      { id: 'mina_reabrir', text: 'Escorar a mina e reabri-la', next: 'o_labirinto_tem_senha', consequence: 'A mina volta a produzir, e uma parte do que sai dela é sua.', effects: fx('matExtra:montanhas_cinzentas:15', 'ouroPct:5', 'custoMat:minerio_cinzento:6') },
      { id: 'mina_descer', text: 'Descer mais fundo, atrás das brocas', next: 'o_labirinto_tem_senha', consequence: 'Você encontra o que os mineiros encontraram. Você volta; eles não voltaram.', effects: fx('chefes:1', 'xp:4') },
    ],
  },
  // N11
  {
    id: 'o_labirinto_tem_senha', act: 2, title: 'O Labirinto Tem Senha', speaker: 'Borin Fenrick', region: 'Kholgard',
    dialogue: 'O Labirinto tem uma senha rúnica. Meu avô sabia. Meu avô também sabia onde deixou o martelo, e olha onde estamos. Resolve logo, antes que o Minotauro resolva você.',
    requirement: { type: 'region', target: 'khar_dur', amount: 1, label: 'Derrote um chefe de Kholgard' },
    choices: [
      { id: 'labirinto_decifrar', text: 'Decifrar as runas com paciência', next: 'cofre_dos_reis', consequence: 'Borin resmunga "nada mal". É o maior elogio que ele já fez.', effects: fx('forja:5') },
      { id: 'labirinto_derrubar', text: 'Derrubar a parede mais fina', next: 'cofre_dos_reis', consequence: 'Funciona. Kholgard inteira ouve. O Minotauro também.', effects: fx('ataque:1', 'hostil:khar_dur:10') },
      { id: 'labirinto_mapear', text: 'Mapear o labirinto e vender o mapa', next: 'cofre_dos_reis', consequence: 'Aventureiros pagam bem para não morrer, e você aprende a ler corredores.', effects: fx('ouro:50', 'masmorra:10') },
    ],
  },
  // N12
  {
    id: 'cofre_dos_reis', act: 2, title: 'O Cofre dos Reis Anões', speaker: 'Borin Fenrick', region: 'Kholgard',
    dialogue: 'O Cofre guarda metade da Coroa Partida. A outra metade está com quem começou essa bagunça. Traga runas anãs para abrir a porta. E NÃO toque em nada. Tá. Toque em uma coisa.',
    requirement: { type: 'material', target: 'runa_ana', amount: 5, label: 'Reúna Runa Anã ×5' },
    choices: [
      { id: 'cofre_selar', text: 'Não levar nada e selar o cofre de novo', next: 'forja_runas', consequence: 'Os reis anões dormem em paz. Borin tira o chapéu, coisa rara.', effects: fx('vigor:1', 'titulo:Guardião do Cofre', 'custoMat:runa_ana:5') },
      { id: 'cofre_ouro', text: 'Levar o ouro dos reis', next: 'forja_runas', consequence: 'Ouro antigo pesa mais, na mochila e na consciência. Borin nunca mais te empresta a bigorna boa.', effects: fx('ouro:120', 'forja:-3') },
      { id: 'cofre_coroa', text: 'Levar o fragmento da Coroa Partida', next: 'forja_runas', consequence: 'O fragmento é frio e sussurra. Você finge que não escuta.', effects: fx('chefes:2', 'res:sombra:-5') },
    ],
  },
  // ---------- Ato 3 ----------
  // N13
  {
    id: 'fogo_de_segunda_mao', act: 3, title: 'Fogo de Segunda Mão', speaker: 'Ophira Vane', region: 'Pico de Ignaris',
    dialogue: 'A lava está mais fria do que devia. Medi com o termômetro, com o cotovelo e com um aprendiz. Algo está sugando o calor do vulcão. Isso é terrível! E fascinante! Mas principalmente fascinante.',
    requirement: { type: 'victories', target: 'pico_escarlate', amount: 8, label: 'Vença 8 combates no Pico de Ignaris' },
    choices: [
      { id: 'ophira_medir', text: 'Ajudar Ophira a medir o calor roubado', next: 'aco_que_respira', consequence: 'Vocês descobrem para onde o calor vai: para baixo, e para o mar.', effects: fx('res:fogo:10') },
      { id: 'ophira_elixir', text: 'Aceitar o elixir experimental', next: 'aco_que_respira', consequence: 'Tem gosto de pimenta e de más decisões. Funciona.', effects: fx('energia:1', 'item:oleo_fogo_ancestral:2') },
      { id: 'ophira_socio', text: 'Comprar a fórmula e virar sócio', next: 'aco_que_respira', consequence: 'Você é oficialmente sócio de uma alquimista. Que os deuses te ajudem.', effects: fx('pocao:15', 'custoOuro:60') },
    ],
  },
  // N14
  {
    id: 'aco_que_respira', act: 3, title: 'Aço que Respira', speaker: 'Cassian Draye', region: 'Pico de Ignaris',
    dialogue: 'Os draconatos forjam lâminas que respiram fogo. Eu forjo lâminas que respiram inveja. Traga-me o segredo deles e talvez eu te considere digno de carregar uma das minhas. Talvez.',
    requirement: { type: 'region', target: 'pico_escarlate', amount: 1, label: 'Derrote um chefe do Pico de Ignaris' },
    choices: [
      { id: 'cassian_aprender', text: 'Aprender a técnica com os próprios draconatos', next: 'chama_escarlate', consequence: 'Cassian finge desdém. Anota tudo.', effects: fx('forja:5', 'res:fogo:5') },
      { id: 'cassian_trocar', text: 'Trocar o segredo por uma arma de Cassian', next: 'chama_escarlate', consequence: 'A lâmina é perfeita. O discurso que vem junto, nem tanto.', effects: fx('ataque:1') },
      { id: 'cassian_duelar', text: 'Vencer Cassian num duelo pelo segredo', next: 'chama_escarlate', consequence: 'Cassian perde. E conta para todos que ganhou.', effects: fx('crit:3', 'titulo:Quem Venceu Cassian') },
    ],
  },
  // N15
  {
    id: 'fenix_presa', act: 3, title: 'A Fênix que Não Queria Voltar', speaker: 'Alaric Thorne', region: 'Pico de Ignaris',
    dialogue: 'A Fênix do Sol Morto renasce presa! Cada vez mais escura, mais triste, mais... trágica! Como eu, na primavera de 12! Só uma armadura minha, minha obra-prima, sobreviveria às chamas dela!',
    requirement: { type: 'region', target: 'pico_escarlate', amount: 4, label: 'Derrote 4 chefes do Pico de Ignaris' },
    choices: [
      { id: 'fenix_libertar', text: 'Libertar a Fênix do ciclo', next: 'tesouro_de_ignaroth', consequence: 'Ela voa para longe e deixa uma pena como agradecimento. Alaric chora, como sempre.', effects: fx('item:elixir_fenix:1', 'vida:5') },
      { id: 'fenix_armadura', text: 'Deixar Alaric forjar com as cinzas dela', next: 'tesouro_de_ignaroth', consequence: 'A armadura é linda. Alaric também acha, em voz alta, por uma hora.', effects: fx('vigor:1', 'res:fogo:5') },
      { id: 'fenix_estudar', text: 'Estudar o renascimento da Fênix', next: 'tesouro_de_ignaroth', consequence: 'Você não aprende a voltar da morte. Aprende a demorar mais para ir.', effects: fx('bencao:1', 'supremo:10') },
    ],
  },
  // N16
  {
    id: 'tesouro_de_ignaroth', act: 3, title: 'O Tesouro de Ignaroth', speaker: 'Ignaroth', region: 'Pico de Ignaris',
    dialogue: 'Pequeno campeão. Entre as minhas escamas há ouro de dez reinos e uma única pergunta: o que você fará quando o Sol Negro cair? Escolha o que levar. Eu saberei o que você é.',
    requirement: { type: 'material', target: 'escama_rubra', amount: 6, label: 'Reúna Escama Rubra ×6' },
    choices: [
      { id: 'ignaroth_nada', text: 'Não levar nada e partir', next: 'porteiro_do_fim', consequence: 'O dragão ri, e a montanha treme de respeito.', effects: fx('chefes:2', 'titulo:Respeitado por Ignaroth') },
      { id: 'ignaroth_ouro', text: 'Levar ouro de dragão', next: 'porteiro_do_fim', consequence: 'Ouro de dragão nunca acaba. Só acaba quem o carrega.', effects: fx('ouro:150', 'ouroPct:5') },
      { id: 'ignaroth_escama', text: 'Pedir uma escama do próprio dragão', next: 'porteiro_do_fim', consequence: 'Ignaroth arranca uma escama e a entrega. Dói nele. Ele não demonstra.', effects: fx('vida:8', 'res:fogo:5') },
    ],
  },
  // N17
  {
    id: 'mortos_nao_pagam_aluguel', act: 3, title: 'Os Mortos Não Pagam Aluguel', speaker: 'Gideon Mascarado', region: 'Terras de Morvath',
    dialogue: 'As brocas abriram as catacumbas e agora os mortos passeiam pela vila como se fossem donos. Tecnicamente, eram. Tenho três relíquias que acalmam fantasmas. Uma funciona. Quer apostar qual?',
    requirement: { type: 'victories', target: 'terras_mortas', amount: 8, label: 'Vença 8 combates nas Terras de Morvath' },
    choices: [
      { id: 'gideon_verdade', text: 'Exigir que Gideon diga qual relíquia funciona', next: 'prefeito_sem_face', consequence: 'Ele diz. Você acha que ele mentiu. Não mentiu. Isso te incomoda mais.', effects: fx('res:sombra:10') },
      { id: 'gideon_tres', text: 'Comprar as três relíquias', next: 'prefeito_sem_face', consequence: 'Uma funciona. As outras duas atraem coisas que deixam bom espólio.', effects: fx('saque:5', 'item:antidoto:2', 'custoOuro:80') },
      { id: 'gideon_furtar', text: 'Furtar as relíquias enquanto ele fala', next: 'prefeito_sem_face', consequence: 'Gideon percebe. Gideon sorri. Os mercadores passam a te cobrar "taxa de confiança".', effects: fx('ouroPct:5', 'loja:5') },
    ],
  },
  // N18
  {
    id: 'prefeito_sem_face', act: 3, title: 'O Prefeito Sem Face', speaker: 'Padre Lucian', region: 'Terras de Morvath',
    dialogue: 'Na Vila dos Sem-Rosto, as pessoas esqueceram os próprios nomes. Eu anoto cada um que lembram, num livro. O livro está quase vazio. Escolha como devolveremos o que lhes foi tirado.',
    requirement: { type: 'region', target: 'terras_mortas', amount: 1, label: 'Derrote um chefe das Terras de Morvath' },
    choices: [
      { id: 'lucian_nomes', text: 'Devolver os nomes, um por um', next: 'mortos_falam', consequence: 'Leva a noite inteira. De manhã, alguém te chama pelo seu, e você percebe o quanto sentia falta.', effects: fx('vida:6') },
      { id: 'lucian_mascara', text: 'Usar a máscara do Prefeito para enganar os mortos', next: 'mortos_falam', consequence: 'Os mortos te ignoram. Os vivos também. É estranhamente relaxante.', effects: fx('esquiva:3') },
      { id: 'lucian_livro', text: 'Levar o livro dos nomes para estudo', next: 'mortos_falam', consequence: 'Nomes têm poder, e você agora sabe como os mortos de Morvath se chamam.', effects: fx('dano:terras_mortas:10', 'crit:2') },
    ],
  },
  // N19
  {
    id: 'selos_rompidos', act: 3, title: 'Os Selos Rompidos', speaker: 'Padre Lucian', region: 'Terras de Morvath',
    dialogue: 'As brocas não romperam os selos por acidente. Alguém sabia onde cavar. Os selos podem ser refeitos com fé ou com ferro. O ferro é mais barato. Também é o que menos dura.',
    requirement: { type: 'region', target: 'terras_mortas', amount: 3, label: 'Derrote 3 chefes das Terras de Morvath' },
    choices: [
      { id: 'selos_vigilia', text: 'Refazer os selos com uma vigília', next: 'quem_paga_os_necromantes', consequence: 'Uma noite inteira de orações. Seus joelhos nunca vão perdoar.', effects: fx('res:sombra:10', 'bencao:1') },
      { id: 'selos_ferro', text: 'Soldar os selos com minério da serra', next: 'quem_paga_os_necromantes', consequence: 'Resiste por uma geração. Depois é problema de outra geração.', effects: fx('vigor:1', 'custoMat:minerio_cinzento:4') },
      { id: 'selos_abrir', text: 'Deixar um selo aberto para ver o que sai', next: 'quem_paga_os_necromantes', consequence: 'O que sai é grande, zangado e deixa muito espólio. E continua saindo.', effects: fx('saque:6', 'hostil:terras_mortas:10') },
    ],
  },
  // N20
  {
    id: 'quem_paga_os_necromantes', act: 3, title: 'Quem Paga os Necromantes', speaker: 'Gideon Mascarado', region: 'Terras de Morvath',
    dialogue: 'Encontrei os livros de contas da Torre. Os necromantes recebiam em latão, de gente de terno, do outro lado do mar. Eu sei: "Gideon, você também recebe de qualquer um". Mas eu tenho padrão. Baixo, mas tenho.',
    requirement: { type: 'region', target: 'terras_mortas', amount: 4, label: 'Derrote 4 chefes das Terras de Morvath' },
    choices: [
      { id: 'contas_guilda', text: 'Entregar o livro de contas à Guilda', next: 'porteiro_do_fim', consequence: 'Brenna manda um bilhete: "bom trabalho". Emoldure. Não vai acontecer de novo.', effects: fx('guilda:10', 'titulo:Auditor de Morvath') },
      { id: 'contas_chantagem', text: 'Chantagear os contadores da Torre', next: 'porteiro_do_fim', consequence: 'O dinheiro chega pontualmente, todo mês, junto com olhares assassinos.', effects: fx('ouroPct:8') },
      { id: 'contas_queimar', text: 'Queimar a Torre com os livros dentro', next: 'porteiro_do_fim', consequence: 'Nada de provas, nada de necromantes, uma fogueira ótima.', effects: fx('ataque:1', 'res:sombra:5') },
    ],
  },
  // ---------- Ato 4 ----------
  // N21
  {
    id: 'porteiro_do_fim', act: 4, title: 'O Porteiro do Fim do Mundo', speaker: 'Oráculo Danika', region: 'Reino do Sol Negro',
    dialogue: 'Os portões abrem para quem tem algo a perder. Você tem. Por isso vai hesitar. Não hesite. Escolha o que deixar para trás antes de entrar; lá dentro, ele escolhe por você.',
    requirement: { type: 'victories', target: 'coracao_eclipse', amount: 8, label: 'Vença 8 combates no Reino do Sol Negro' },
    choices: [
      { id: 'portao_ouro', text: 'Deixar para trás o ouro', next: 'o_que_vaelora_viu', consequence: 'Mais leve, você anda mais rápido. E sente menos falta do que imaginava.', effects: fx('destreza:1', 'esquiva:2', 'custoOuro:100') },
      { id: 'portao_medo', text: 'Deixar para trás o medo', next: 'o_que_vaelora_viu', consequence: 'Danika assente. É o máximo de emoção que ela demonstra num ano.', effects: fx('crit:3', 'supremo:10') },
      { id: 'portao_nome', text: 'Deixar para trás o próprio nome', next: 'o_que_vaelora_viu', consequence: 'Ninguém lá dentro saberá como te chamar. Nem para te amaldiçoar.', effects: fx('res:arcano:10', 'res:sombra:5') },
    ],
  },
  // N22
  {
    id: 'o_que_vaelora_viu', act: 4, title: 'O Que Vaelora Viu', speaker: 'Vaelora, Senhora do Véu', region: 'Reino do Sol Negro',
    dialogue: 'Eu vi os cabos, campeão. Descem do céu do outro lado do mar e bebem daqui. Malgor não é a doença; é só a febre. Quer a cura ou quer a vingança? Não há tempo para as duas.',
    requirement: { type: 'region', target: 'coracao_eclipse', amount: 2, label: 'Derrote 2 chefes do Reino do Sol Negro' },
    choices: [
      { id: 'veu_cura', text: 'Buscar a cura: rastrear os cabos', next: 'cronista_do_fim', consequence: 'Você marca no mapa de onde vêm os cabos. Um mar inteiro de distância.', effects: fx('xp:5', 'titulo:Rastreador dos Cabos') },
      { id: 'veu_vinganca', text: 'Buscar a vingança: estudar Malgor', next: 'cronista_do_fim', consequence: 'Vaelora sorri, triste. "Todos escolhem isso."', effects: fx('dano:coracao_eclipse:10', 'chefes:1') },
      { id: 'veu_mentir', text: 'Mentir para Vaelora e tentar as duas', next: 'cronista_do_fim', consequence: 'Ela sabe que você mentiu. Te deixa ir mesmo assim, por curiosidade.', effects: fx('ouroPct:5', 'saque:5') },
    ],
  },
  // N23
  {
    id: 'cronista_do_fim', act: 4, title: 'O Cronista do Fim', speaker: 'Cronista do Fim', region: 'Reino do Sol Negro',
    dialogue: 'Este arquivo guarda todos os finais possíveis. Na maioria deles você morre. Em alguns, pior: você vence e ninguém lembra. Escolha uma página para rasgar.',
    requirement: { type: 'region', target: 'coracao_eclipse', amount: 3, label: 'Derrote 3 chefes do Reino do Sol Negro' },
    choices: [
      { id: 'arquivo_morte', text: 'Rasgar a página em que você morre', next: 'coracao', consequence: 'Uma morte a menos no mundo. Pelo menos no papel.', effects: fx('bencao:2', 'vida:5') },
      { id: 'arquivo_esquecido', text: 'Rasgar a página em que ninguém lembra de você', next: 'coracao', consequence: 'Seu nome será cantado. Desafinado, mas cantado.', effects: fx('titulo:Lembrado pelas Eras', 'guilda:10', 'ouroPct:5') },
      { id: 'arquivo_malgor', text: 'Rasgar a página em que Malgor vence', next: 'coracao', consequence: 'O arquivo estremece. Algumas páginas pegam fogo sozinhas.', effects: fx('chefes:2', 'crit:2') },
    ],
  },
  // ---------- Ato 5 ----------
  // N24
  {
    id: 'carga_nao_declarada', act: 5, title: 'Carga Não Declarada', speaker: 'Capitã Vanya', region: 'Cumes de Frostgard',
    dialogue: 'Minhas perfuratrizes carregam o que o manifesto diz. O manifesto diz "minério". O minério grita à noite. Não é problema meu. Agora é seu.',
    requirement: { type: 'victories', target: 'frostgard', amount: 8, label: 'Vença 8 combates nos Cumes de Frostgard' },
    choices: [
      { id: 'vanya_abrir', text: 'Abrir a carga e libertar o que grita', next: 'flores_de_cobre', consequence: 'É um espírito da floresta de Havendown, engarrafado. Ele agradece com o único presente que tem.', effects: fx('vida:8', 'res:gelo:5') },
      { id: 'vanya_escoltar', text: 'Escoltar a carga sem perguntas', next: 'flores_de_cobre', consequence: 'Vanya paga o combinado e nem um cobre a mais. E passa a te respeitar por isso.', effects: fx('ouro:200', 'ouroPct:5') },
      { id: 'vanya_desviar', text: 'Desviar a carga para a Rebelião', next: 'flores_de_cobre', consequence: 'Maeve fica sabendo e te ensina os atalhos. Os guardas de Vanya também ficam sabendo.', effects: fx('xp:5', 'hostil:frostgard:10') },
    ],
  },
  // N25
  {
    id: 'flores_de_cobre', act: 5, title: 'Flores de Cobre', speaker: 'Garrick Engrenafolha', region: 'Bosque de Engrenverde',
    dialogue: 'Eu ensinei uma rosa a girar engrenagens! Ela gira! Ela também morde, mas é detalhe de projeto. O problema: a seiva que eu uso vem de Havendown. Pelo cano. Roubada. Ai.',
    requirement: { type: 'material', target: 'seiva_encanada', amount: 6, label: 'Reúna Seiva Encanada ×6' },
    choices: [
      { id: 'garrick_cultivar', text: 'Convencer Garrick a cultivar seiva própria', next: 'greve_nos_trilhos', consequence: 'Demora anos, mas as poções da estufa são as melhores do continente.', effects: fx('pocao:10', 'vida:5', 'custoMat:seiva_encanada:6') },
      { id: 'garrick_enxerto', text: 'Levar um enxerto de rosa-engrenagem', next: 'greve_nos_trilhos', consequence: 'Ela vive na sua mochila e às vezes corta quem chega perto demais.', effects: fx('crit:2', 'esquiva:2') },
      { id: 'garrick_patente', text: 'Registrar a patente no nome dos dois', next: 'greve_nos_trilhos', consequence: 'Chegam royalties de cada estufa de Steelmere. Garrick nunca leu o contrato.', effects: fx('ouroPct:8') },
    ],
  },
  // N26
  {
    id: 'greve_nos_trilhos', act: 5, title: 'Greve nos Trilhos', speaker: 'Maeve Faísca', region: 'Campos de Trilhouro',
    dialogue: 'Os trens param amanhã! Todos! Se o Sindicato quiser grão, que venha buscar a pé! Você está com a gente ou com o Inspetor Sterling? E não diga "depende". Ninguém nunca ganhou uma revolução com "depende".',
    requirement: { type: 'region', target: 'trilhouro', amount: 2, label: 'Derrote 2 chefes dos Campos de Trilhouro' },
    choices: [
      { id: 'greve_apoiar', text: 'Apoiar a greve nos piquetes', next: 'caldeira_no_vermelho', consequence: 'Os trabalhadores cantam seu nome. Mal, mas cantam.', effects: fx('vigor:1', 'titulo:Voz dos Trilhos') },
      { id: 'greve_mediar', text: 'Mediar um acordo com Silas Sterling', next: 'caldeira_no_vermelho', consequence: 'Ninguém sai feliz. Por isso mesmo funciona, e os comerciantes te agradecem.', effects: fx('loja:-10') },
      { id: 'greve_furar', text: 'Escoltar os trens do Sindicato', next: 'caldeira_no_vermelho', consequence: 'O Sindicato paga muito bem. Os grevistas de Trilhouro nunca mais te deixam em paz.', effects: fx('ouro:250', 'saque:5', 'hostil:trilhouro:10') },
    ],
  },
  // ---------- Ato 6 ----------
  // N27
  {
    id: 'caldeira_no_vermelho', act: 6, title: 'A Caldeira no Vermelho', speaker: 'Mestre Ignatius Drake', region: 'Caldeira de Vulcannis',
    dialogue: 'O ponteiro da pressão passou do vermelho, entrou no "vermelho-escuro" e agora está num tom que eu chamo de "ops". Podemos aliviar, sabotar ou vender ingressos para a explosão.',
    requirement: { type: 'material', target: 'escoria_vulcanica', amount: 8, label: 'Reúna Escória Vulcânica ×8' },
    choices: [
      { id: 'caldeira_aliviar', text: 'Aliviar as válvulas com Ignatius', next: 'os_que_foram_desligados', consequence: 'A cidade dorme tranquila, sem saber que quase acordou em órbita.', effects: fx('res:fogo:10', 'vida:5') },
      { id: 'caldeira_sabotar', text: 'Sabotar a caldeira do Sindicato', next: 'os_que_foram_desligados', consequence: 'O dreno de Havendown engasga por uma semana. Do outro lado do mar, alguém respira melhor.', effects: fx('ataque:1', 'supremo:10') },
      { id: 'caldeira_ingressos', text: 'Vender ingressos para "a quase explosão"', next: 'os_que_foram_desligados', consequence: 'Ignatius adora a ideia. A caldeira, não.', effects: fx('ouro:300', 'ouroPct:3') },
    ],
  },
  // N28
  {
    id: 'os_que_foram_desligados', act: 6, title: 'Os Que Foram Desligados', speaker: 'Unidade 73', region: 'Charco de Ferrujal',
    dialogue: 'UNIDADE 73. ESTADO: DESLIGADA. EXCETO QUE NÃO. Os outros não acordam. Eu acordei porque alguém esqueceu de apagar minha memória. Você pode religá-los, desmontá-los ou deixar que eu decida. Aviso: eu decido mal.',
    requirement: { type: 'region', target: 'ferrujal', amount: 2, label: 'Derrote 2 chefes do Charco de Ferrujal' },
    choices: [
      { id: 'automatos_religar', text: 'Religar os autômatos esquecidos', next: 'baile_do_magnata', consequence: 'Mil olhos de vidro se acendem. Alguns agradecem. Outros ainda estão pensando.', effects: fx('vigor:1', 'esquiva:2') },
      { id: 'automatos_desmontar', text: 'Desmontar os autômatos por peças', next: 'baile_do_magnata', consequence: 'Peças raras, zero perguntas. A Unidade 73 anota seu nome num arquivo chamado "depois".', effects: fx('mat:fragmento_fisico:8', 'mat:essencia_magica:6', 'forja:5') },
      { id: 'automatos_73', text: 'Deixar a Unidade 73 decidir', next: 'baile_do_magnata', consequence: 'Ela decide te seguir. Você não sabe se é lealdade ou estudo de campo.', effects: fx('supremo:10', 'crit:3') },
    ],
  },
  // ---------- Ato 7 ----------
  // N29
  {
    id: 'baile_do_magnata', act: 7, title: 'O Baile do Magnata', speaker: 'Lorde Hamilton Cross', region: 'Cidade de Coroferro',
    dialogue: 'Um herói de Havendown no meu baile! Que exótico! Sente-se, coma algo que custa mais que a sua armadura e me diga: o que um homem como eu precisa fazer para ter você do lado certo da história? O lado certo é o meu, naturalmente.',
    requirement: { type: 'material', target: 'engrenagem_real', amount: 6, label: 'Reúna Engrenagem Real ×6' },
    choices: [
      { id: 'baile_expor', text: 'Recusar o convite e expor Hamilton', next: 'consciencia_no_reator', consequence: 'O baile acaba em escândalo. A Dra. Elian Vance te passa um bilhete: "obrigada. corre."', effects: fx('xp:5', 'res:arcano:5') },
      { id: 'baile_patrocinio', text: 'Aceitar o patrocínio de Hamilton', next: 'consciencia_no_reator', consequence: 'Seu equipamento nunca foi tão bem polido. Sua reputação na Guilda, nunca tão manchada.', effects: fx('ouro:400', 'loja:-10', 'guilda:-10') },
      { id: 'baile_espionar', text: 'Fingir aceitar e roubar as plantas do reator', next: 'consciencia_no_reator', consequence: 'Você sai do baile com um canapé e as plantas do Núcleo de Aetherium.', effects: fx('dano:aetherium:10', 'saque:5') },
    ],
  },
  // N30
  {
    id: 'consciencia_no_reator', act: 7, title: 'A Consciência no Reator', speaker: 'Corvin Vane', region: 'Núcleo de Aetherium',
    dialogue: 'O reator pensa. Sente. Implora, em linguagem de pressão e temperatura. A decisão final vem depois, na calibração. Esta é outra: quem você leva consigo até lá em cima.',
    requirement: { type: 'region', target: 'aetherium', amount: 3, label: 'Derrote 3 chefes do Núcleo de Aetherium' },
    choices: [
      { id: 'reator_aliados', text: 'Levar os aliados de Steelmere', next: 'epilogo_dois_mundos', consequence: 'Maeve, Vanya, Garrick, até Ignatius. Ninguém sobe sozinho a escada do fim.', effects: fx('vida:10', 'bencao:1') },
      { id: 'reator_sozinho', text: 'Subir sozinho', next: 'epilogo_dois_mundos', consequence: 'O silêncio é total. Você ouve o reator chorar, e isso te dá uma raiva útil.', effects: fx('ataque:1', 'crit:3') },
      { id: 'reator_conversar', text: 'Conversar com o reator antes de tudo', next: 'epilogo_dois_mundos', consequence: 'Ele não responde com palavras. Responde abrindo uma porta.', effects: fx('res:arcano:10', 'supremo:10') },
    ],
  },
  // Fecho da Crônica depois de N30. O final da campanha em si vem da missão q_steelmere_final_resonance.
  {
    id: 'epilogo_dois_mundos', act: 7, title: 'Dois Mundos, Uma Corrente', speaker: 'Brenna Ashcombe', region: 'Guilda',
    dialogue: 'O que o reator vai ser daqui para frente foi decidido lá em cima, na calibração. O resto, quem você salvou, quem você enganou e o que carregou nas costas dos dois lados do mar, está escrito nestas páginas. A Guilda não reembolsa caixão. Desta vez, não precisou.',
    choices: [],
  },
]
