export type QuestType = 'delivery' | 'talk' | 'hunt' | 'boss'

export interface QuestItem {
  id: string
  name: string
  quantity: number
  description: string
  icon?: string
}

export interface StoryQuest {
  id: string
  act: number
  title: string
  summary: string
  sourceNpcId: string
  targetNpcId: string
  targetRegionId: string
  type: QuestType
  requiredProgress: number
  questItem?: QuestItem
  targetEnemyName?: string
  dialogue: {
    offer: string
    inProgress: string
    targetWelcome: string
    completion: string
  }
  reward: {
    gold: number
    xp: number
    loreTitle?: string
    itemReward?: string
    unlockWorld?: string
  }
  nextQuestId?: string
}

export const STORY_QUESTS: StoryQuest[] = [
  {
    id: 'q_alvora_intro',
    act: 1,
    title: 'O Antídoto Urgente',
    summary: 'Leve o frasco de antídoto de Sela Hartwin nas Planícies de Alvora até a Mestra Lyriel na Floresta de Abdendriel.',
    sourceNpcId: 'sela_hartwin',
    targetNpcId: 'lyriel_noite',
    targetRegionId: 'floresta_lunargenta',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'antidoto_sela',
      name: 'Antídoto de Ervas Raras',
      quantity: 1,
      description: 'Frasco contendo infusão purificada para deter a febre ciana dos batedores de Abdendriel.',
      icon: '🧪',
    },
    dialogue: {
      offer: 'A água das planícies está estranha e os batedores voltaram com febre ciana vítrea. Preparei este antídoto concentrado, mas Mestra Lyriel na Floresta de Abdendriel é a única capaz de curar a raiz da praga. Viaje até a floresta e entregue este frasco nas mãos dela!',
      inProgress: 'Ainda não chegou a Abdendriel? Siga pela estrada leste, a Mestra Lyriel aguarda perto do monólito ancestral.',
      targetWelcome: 'Você traz o selo de Sela Hartwin de Alvora? Deixe-me examinar esse frasco com urgência...',
      completion: 'Pelos ramos ancestrais! O extrato chegou antes que a infecção tomasse as raízes do bosque. A floresta reconhece sua coragem, forasteiro. Tome este ouro e bênção!',
    },
    reward: {
      gold: 35,
      xp: 45,
      loreTitle: 'Mensageiro da Alvorada',
    },
    nextQuestId: 'q_abdendriel_scout',
  },
  {
    id: 'q_abdendriel_scout',
    act: 1,
    title: 'Aviso na Fronteira',
    summary: 'Entregue o pergaminho de evacuação ao mensageiro Kip Pé-Ligeiro na trilha da floresta.',
    sourceNpcId: 'lyriel_noite',
    targetNpcId: 'kip_ligeiro',
    targetRegionId: 'floresta_lunargenta',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'ordem_evacuacao',
      name: 'Pergaminho de Evacuação',
      quantity: 1,
      description: 'Ordem formal da Guardiã para os batedores recuarem do perímetro perigoso.',
      icon: '📜',
    },
    dialogue: {
      offer: 'Feras mecânicas e cultistas rondam os limites da mata. Kip Pé-Ligeiro vigia o posto de fronteira a oeste quase desarmado. Entregue este pergaminho ordenando seu recuo para a aldeia.',
      inProgress: 'Procure Kip perto da saída oeste de Abdendriel. Ele é assustadiço, então aproxime-se sem armas desembainhadas.',
      targetWelcome: 'Quem está aí?! Não dê mais um passo! Ah... você veio do coração do bosque? O que traz em mãos?',
      completion: 'Uma ordem de recuo assinada pela própria Lyriel?! Pelo céu, muito obrigado! Eu estava vendo vultos de metal entre as árvores a noite inteira. Estou indo agora mesmo!',
    },
    reward: {
      gold: 40,
      xp: 60,
      loreTitle: 'Batedor dos Bosques',
    },
    nextQuestId: 'q_kip_to_kaldrum',
  },
  {
    id: 'q_kip_to_kaldrum',
    act: 2,
    title: 'A Mensagem nas Alturas',
    summary: 'Suba até a Serra de Kaldrum e entregue o relatório de espionagem a Torvald Barbaneve.',
    sourceNpcId: 'kip_ligeiro',
    targetNpcId: 'torvald_barbaneve',
    targetRegionId: 'montanhas_cinzentas',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'relatorio_maquinas',
      name: 'Relatório de Máquinas Clandestinas',
      quantity: 1,
      description: 'Anotações dos batedores sobre comboios mecânicos subindo em direção às minas.',
      icon: '📑',
    },
    dialogue: {
      offer: 'Antes de recuar, vi carroças misteriosas com brocas de ferro subindo em direção à Serra de Kaldrum. Torvald Barbaneve, o chefe das minas, precisa saber disso imediatamente!',
      inProgress: 'A Serra de Kaldrum fica nas montanhas ao norte. O ar é frio e as trilhas congeladas, vá bem agasalhado.',
      targetWelcome: 'Quem ousa subir até minha mina com esse vento uivante?! Fale logo!',
      completion: 'O quê?! Brocas de perfuração desconhecidas escavando sob os meus pés?! Pelas barbas dos meus antepassados, eu sabia que aqueles tremores nas galerias não eram desmoronamento natural! Você fez bem em me alertar.',
    },
    reward: {
      gold: 55,
      xp: 80,
      loreTitle: 'Emissário das Alturas',
    },
    nextQuestId: 'q_kaldrum_ore',
  },
  {
    id: 'q_kaldrum_ore',
    act: 2,
    title: 'Aço para a Bigorna Rúnica',
    summary: 'Transporte uma caixa de Ferro Estelar das minas de Kaldrum até o Ferreiro Borin Fenrick em Kholgard.',
    sourceNpcId: 'torvald_barbaneve',
    targetNpcId: 'borin_fenrick',
    targetRegionId: 'khar_dur',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'ferro_estelar',
      name: 'Lingotes de Ferro Estelar',
      quantity: 1,
      description: 'Minério de altíssima pureza retirado das galerias mais profundas de Kaldrum.',
      icon: '⛏️',
    },
    dialogue: {
      offer: 'Se as montanhas estão sob ameaça, nossos heróis precisam de armas com têmpera divina. Leve esta caixa de Ferro Estelar puro para Borin Fenrick nas forjas de Kholgard!',
      inProgress: 'Borin está em Kholgard, nas ruínas anãs ao sul. Tome cuidado com o peso da caixa ao descer as encostas.',
      targetWelcome: 'Metal bom fala baixo... O que é isso que faz ranger o chão onde você pisa?',
      completion: 'Ferro Estelar de Kaldrum! Não vejo veios tão brilhantes desde a última era. Vou forjar uma lâmina digna de reis com isso. Tome este ouro pelo transporte pesado.',
    },
    reward: {
      gold: 75,
      xp: 110,
      loreTitle: 'Guardião do Aço',
    },
    nextQuestId: 'q_borin_to_morvath',
  },
  {
    id: 'q_borin_to_morvath',
    act: 3,
    title: 'As Vozes das Catacumbas',
    summary: 'Leve o amuleto consagrado de Borin para o Padre Lucian nas Terras de Morvath.',
    sourceNpcId: 'borin_fenrick',
    targetNpcId: 'padre_lucian',
    targetRegionId: 'terras_mortas',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'amuleto_runico_borin',
      name: 'Amuleto Rúnico Consagrado',
      quantity: 1,
      description: 'Artefato esculpido em granito rúnico capaz de dissipar névoas necromânticas.',
      icon: '🧿',
    },
    dialogue: {
      offer: 'Ao temperar o minério, ouvi um eco fúnebre. As máquinas subterrâneas romperam os selos das catacumbas em Morvath. O Padre Lucian está sozinho contendo os mortos. Leve este amuleto sagrado até ele!',
      inProgress: 'As Terras de Morvath são amaldiçoadas e cheias de sepulturas profanadas. O Padre Lucian permanece na capela abandonada.',
      targetWelcome: 'A escuridão é densa aqui, forasteiro... O que você busca nesta terra de cinzas e lamentos?',
      completion: 'A luz deste amuleto afastou os espectros ao redor da capela! Borin ainda lembra de nós... Agora tenho como abençoar os ossos profanados. Que a luz guie sua jornada!',
    },
    reward: {
      gold: 95,
      xp: 150,
      loreTitle: 'Purificador das Sombras',
    },
    nextQuestId: 'q_lucian_to_ignaris',
  },
  {
    id: 'q_lucian_to_ignaris',
    act: 3,
    title: 'O Fogo Purificador',
    summary: 'Entregue o frasco de cinzas purificadas ao Mestre Couraceiro Alaric Thorne no Pico de Ignaris.',
    sourceNpcId: 'padre_lucian',
    targetNpcId: 'alaric_thorne',
    targetRegionId: 'pico_escarlate',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'cinzas_purificadas',
      name: 'Cinzas Purificadas de Morvath',
      quantity: 1,
      description: 'Pó sagrado destilado das almas salvas, ideal para ligas resistentes a fogo vil.',
      icon: '🏺',
    },
    dialogue: {
      offer: 'Para forjar armaduras capazes de resistir ao calor da fenda cósmica que se abre a leste, Alaric Thorne no Pico de Ignaris precisa destas Cinzas Purificadas. Suba até as forjas de lava e entregue a ele.',
      inProgress: 'O calor do Pico de Ignaris derrete solas comuns de bota. Encontre Alaric perto das plataformas de forja.',
      targetWelcome: 'Cuidado onde pisa, andarilho! Aqui até a poeira queima. O que trouxe para minha bigorna?',
      completion: 'Cinzas purificadas das catacumbas?! Essa é a única liga que impede que a armadura se quebre sob o calor do Sol Negro! Tome sua paga, você é mais resistente que muito veterano.',
    },
    reward: {
      gold: 120,
      xp: 200,
      loreTitle: 'Forjado no Fogo',
    },
    nextQuestId: 'q_ignaris_to_eclipse',
  },
  {
    id: 'q_ignaris_to_eclipse',
    act: 4,
    title: 'O Olho do Eclipse',
    summary: 'Leve o catalisador ígneo de Alaric para a Oráculo Danika no Reino do Sol Negro.',
    sourceNpcId: 'alaric_thorne',
    targetNpcId: 'oraculo_danika',
    targetRegionId: 'coracao_eclipse',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'catalisador_igneo',
      name: 'Catalisador de Fogo Primordial',
      quantity: 1,
      description: 'Orbe incandescente que mantém a visão arcana desperta frente ao vazio do eclipse.',
      icon: '🔮',
    },
    dialogue: {
      offer: 'O Reino do Sol Negro está tragando todo o horizonte a leste. A Oráculo Danika precisa deste Catalisador de Fogo para não ser consumida pela escuridão enquanto busca a verdade.',
      inProgress: 'O Reino do Sol Negro rompeu o véu da realidade. Siga com extrema cautela.',
      targetWelcome: 'Seus passos ecoam na fenda do vazio... Posso sentir a centelha viva que você traz no peito.',
      completion: 'O calor de Havendown! Danika enxerga... Olhe através do véu! O mal que nos assola não nasceu de deuses sombrios, mas de motores e caldeiras vorazes vindos de além-mar: o continente de Steelmere!',
    },
    reward: {
      gold: 160,
      xp: 280,
      loreTitle: 'Testemunha do Véu',
    },
    nextQuestId: 'q_cross_oceans',
  },
  {
    id: 'q_cross_oceans',
    act: 4,
    title: 'A Grande Travessia de Éter',
    summary: 'Entregue o Selo dos Mares à Capitã Vanya nos Cumes de Frostgard em Steelmere para abrir a rota.',
    sourceNpcId: 'oraculo_danika',
    targetNpcId: 'vanya_mar',
    targetRegionId: 'frostgard',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'selo_dos_mares',
      name: 'Selo do Navegador do Éter',
      quantity: 1,
      description: 'Talismã antigo que permite cruzar a tempestade que separa Havendown de Steelmere.',
      icon: '🧭',
    },
    dialogue: {
      offer: 'Havendown secará até a última gota se as bombas de sucção em Steelmere não forem desativadas. Tome este Selo dos Mares. Encontre a Capitã Vanya nos Cumes de Frostgard do outro lado do oceano!',
      inProgress: 'Viaje através do porto e alcance Steelmere. A Capitã Vanya aguarda nas docas geladas de Frostgard.',
      targetWelcome: 'Quem é você que desembarca do quebra-gelos encarando a tempestade? Deixe-me ver essa relíquia!',
      completion: 'Pelos parafusos enferrujados! O Selo do Éter de Havendown... As lendas eram reais! Bem-vindo a Steelmere, viajante. Aqui o vapor não dorme e o Sindicato do Latão comanda com mão de ferro.',
    },
    reward: {
      gold: 220,
      xp: 400,
      loreTitle: 'Viajante dos Dois Continentes',
      unlockWorld: 'steelmere',
    },
    nextQuestId: 'q_frostgard_manifest',
  },
  {
    id: 'q_frostgard_manifest',
    act: 5,
    title: 'O Manifesto das Ferrovias',
    summary: 'Leve o manifesto confidencial de perfuração até o Inspetor Silas Sterling nos Campos de Trilhouro.',
    sourceNpcId: 'vanya_mar',
    targetNpcId: 'silas_sterling',
    targetRegionId: 'trilhouro',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'manifesto_cargas',
      name: 'Manifesto Confidencial de Cargas',
      quantity: 1,
      description: 'Documento comprovando a exportação forçada de Aetherium drenado para a capital.',
      icon: '📜',
    },
    dialogue: {
      offer: 'As perfuratrizes a vapor de Frostgard estão sugando o dobro de energia. O Inspetor Silas nos Campos de Trilhouro precisa deste manifesto oficial para saber onde os comboios blindados estão estocando o mineral.',
      inProgress: 'Os Campos de Trilhouro são cortados por ferrovias a vapor. Silas fica na estação central regulando os trens.',
      targetWelcome: 'Atenção ao relógio! O expresso de latão não espera ninguém. O que você quer com a fiscalização?',
      completion: 'Cinco minutos adiantado! Esse manifesto... O Sindicato está esvaziando os silos rurais para abastecer o reator supremo de Coroferro! Precisamos agir rápido.',
    },
    reward: {
      gold: 280,
      xp: 500,
      loreTitle: 'Fiscal dos Trilhos',
    },
    nextQuestId: 'q_trilhouro_rebellion',
  },
  {
    id: 'q_trilhouro_rebellion',
    act: 5,
    title: 'Faíscas da Revolta',
    summary: 'Entregue o mapa de rotas dos comboios à líder rebelde Maeve Faísca no armazém secreto de Trilhouro.',
    sourceNpcId: 'silas_sterling',
    targetNpcId: 'maeve_faisca',
    targetRegionId: 'trilhouro',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'mapa_rotas_comboio',
      name: 'Mapa de Rotas de Comboios Blindados',
      quantity: 1,
      description: 'Diagrama detalhado dos horários e desvios férreos do Sindicato.',
      icon: '🗺️',
    },
    dialogue: {
      offer: 'Eu respeito as regras, mas não sou cúmplice da tirania. Maeve Faísca lidera os trabalhadores rebeldes em um armazém secreto aqui em Trilhouro. Entregue este mapa para que eles interceptem os comboios!',
      inProgress: 'Maeve não confia em estranhos. Diga que veio a mando de Silas da estação.',
      targetWelcome: 'Se for um inspetor do Sindicato, essa chave de cano vai afundar seu crânio... Quem mandou você?',
      completion: 'O mapa com os horários de todos os comboios blindados?! Silas finalmente criou coragem! Agora nós podemos cortar os suprimentos de Aetherium da capital. Excelente trabalho, camarada!',
    },
    reward: {
      gold: 340,
      xp: 650,
      loreTitle: 'Aliado da Rebelião',
    },
    nextQuestId: 'q_vulcannis_valves',
  },
  {
    id: 'q_vulcannis_valves',
    act: 6,
    title: 'A Caldeira no Limite',
    summary: 'Leve as válvulas de alívio térmico até o Mestre-Fogueiro Drake na Caldeira de Vulcannis.',
    sourceNpcId: 'maeve_faisca',
    targetNpcId: 'ignatius_drake',
    targetRegionId: 'vulcannis',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'valvulas_reforcadas',
      name: 'Válvulas de Alívio de Titânio',
      quantity: 1,
      description: 'Conjunto de peças industriais essenciais para evitar a explosão das caldeiras térmicas.',
      icon: '⚙️',
    },
    dialogue: {
      offer: 'O Sindicato está forçando as fornalhas de Vulcannis a trabalhar no limite máximo para sobrecarregar o reator. Leve estas válvulas para o Mestre Drake antes que a montanha inteira venha abaixo!',
      inProgress: 'Vulcannis é uma fornalha a céu aberto. Cuidado com o vapor escaldante das tubulações.',
      targetWelcome: 'Saia de perto dos pistões! A pressão está em 900 libras! O que você trouxe aí?!',
      completion: 'Válvulas de titânio puro! Rápido, encaixe na torre 3! ... [Pfffffffffft!] Ufa! A pressão caiu. Mais dez minutos e essa caldeira teria vaporizado metade de Steelmere. Você tem coragem de sobra, aventureiro!',
    },
    reward: {
      gold: 420,
      xp: 800,
      loreTitle: 'Engenheiro de Choque',
    },
    nextQuestId: 'q_drake_to_rust',
  },
  {
    id: 'q_drake_to_rust',
    act: 6,
    title: 'A Célula dos Esquecidos',
    summary: 'Entregue uma célula de Aetherium estabilizada para a Unidade 73 (Rust) no Charco de Ferrujal.',
    sourceNpcId: 'ignatius_drake',
    targetNpcId: 'unidade_73',
    targetRegionId: 'ferrujal',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'celula_aetherium_pura',
      name: 'Célula de Aetherium Estável',
      quantity: 1,
      description: 'Fonte energética livre da corrupção industrial, capaz de reanimar autômatos danificados.',
      icon: '🔋',
    },
    dialogue: {
      offer: 'No lixão tóxico de Ferrujal, autômatos descartados pelo Sindicato ganharam consciência própria. O líder deles se chama Unidade 73. Leve esta célula estável para eles: eles conhecem os condutos secretos que levam à capital!',
      inProgress: 'O Charco de Ferrujal é ácido e coberto de ferrugem. Procure a carcaça do autômato titã.',
      targetWelcome: '[BIP... PROCESSANDO SINAIS...] FORASTEIRO ORGÂNICO DETECTADO. INTENÇÃO: DESCONHECIDA...',
      completion: '[BIP! CARGA PURIFICADA DETECTADA...] ENERGIA ABSORVIDA. CIRCUITOS DE AUTONOMIA EM 100%. NOSSA ESPÉCIE RECONHECE SUA BENEVOLÊNCIA. OS CONDUTOS SUBTERRÂNEOS PARA A CIDADE DE COROFERRO ESTÃO DESBLOQUEADOS PARA VOCÊ.',
    },
    reward: {
      gold: 500,
      xp: 1000,
      loreTitle: 'Amigo dos Autômatos',
    },
    nextQuestId: 'q_rust_to_vance',
  },
  {
    id: 'q_rust_to_vance',
    act: 7,
    title: 'O Conclave de Coroferro',
    summary: 'Entregue o cartão mestre dos condutos à Dra. Elian Vance em seu refúgio na Cidade de Coroferro.',
    sourceNpcId: 'unidade_73',
    targetNpcId: 'elian_vance',
    targetRegionId: 'coroferro',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'cartao_mestre_condutos',
      name: 'Cartão de Acesso aos Condutos Centrais',
      quantity: 1,
      description: 'Chave perfurada que abre os portões de segurança da torre do reator em Coroferro.',
      icon: '💳',
    },
    dialogue: {
      offer: '[INSTRUÇÃO: LEVE O CARTÃO DE ACESSO À DRA. ELIAN VANCE NO DISTRITO DE COROFERRO. ELA DESENHOU O REATOR E SABE COMO EVITAR A CATÁSTROFE GLOBAL.]',
      inProgress: 'A Dra. Elian Vance se esconde nos níveis inferiores da Cidade de Coroferro, longe da vista dos patrulheiros de latão.',
      targetWelcome: 'Tranque a porta imediatamente! Os autômatos policiais estão vigiando cada esquina... Você veio do ferro-velho?',
      completion: 'O cartão de acesso da Unidade 73! Com isso, podemos entrar na sala de comando do Núcleo de Aetherium e salvar Havendown e Steelmere do colapso definitivo! Você é a verdadeira lenda viva dos dois continentes.',
    },
    reward: {
      gold: 700,
      xp: 1500,
      loreTitle: 'Salvador de Dois Mundos',
    },
  },
  {
    id: 'q_steelmere_pressure_survey',
    act: 6,
    title: 'O Pulso da Forja',
    summary: 'Leve as leituras de criovapor de Frostgard ao Mestre Ignatius Drake na Caldeira de Vulcannis.',
    sourceNpcId: 'vanya_mar',
    targetNpcId: 'ignatius_drake',
    targetRegionId: 'vulcannis',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'leituras_criovapor_frostgard',
      name: 'Leituras de Criovapor de Frostgard',
      quantity: 1,
      description: 'Tiras de registro mostrando que as bombas glaciais e as fornalhas de Vulcannis estão pulsando no mesmo ritmo anormal.',
      icon: '📈',
    },
    dialogue: {
      offer: 'As bombas de Frostgard estão respirando no mesmo compasso das fornalhas de Vulcannis. Isso não acontece por acidente. Leve estas leituras ao Drake antes que alguém transforme o continente inteiro numa chaleira furiosa.',
      inProgress: 'Vulcannis fica ao sul, onde a neve vira vapor antes de tocar o chão. Entregue as leituras ao Mestre Drake.',
      targetWelcome: 'Se veio pedir calma, está no endereço errado! Se veio com números de pressão, aí sim, fale rápido!',
      completion: 'Essas curvas de criovapor batem com minhas válvulas secundárias... pelas juntas da caldeira, o Sindicato sincronizou Frostgard e Vulcannis como um único motor! Isso é brilhante, criminoso e profundamente ofensivo para quem gosta de não explodir.',
    },
    reward: {
      gold: 360,
      xp: 700,
      loreTitle: 'Leitor das Caldeiras',
    },
    nextQuestId: 'q_steelmere_worker_warrants',
  },
  {
    id: 'q_steelmere_worker_warrants',
    act: 6,
    title: 'Mandados de Latão',
    summary: 'Entregue a lista de mandados industriais a Maeve Faísca em Trilhouro antes que os trabalhadores sejam presos.',
    sourceNpcId: 'ignatius_drake',
    targetNpcId: 'maeve_faisca',
    targetRegionId: 'trilhouro',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'mandados_latao',
      name: 'Mandados de Latão do Sindicato',
      quantity: 1,
      description: 'Lista de prisões planejadas contra operadores que se recusaram a aumentar a pressão das caldeiras.',
      icon: '📜',
    },
    dialogue: {
      offer: 'Encontrei esta lista presa atrás de um manômetro adulterado. São mandados contra meus operadores e contra metade da equipe de Maeve. Leve isso a ela. Eu vou fingir que não estou tremendo de raiva para conseguir apertar estes parafusos.',
      inProgress: 'Maeve está em Trilhouro. Se a lista cair nas mãos erradas, os trabalhadores somem antes do próximo turno.',
      targetWelcome: 'Se é mais uma ordem do Sindicato, pode jogar no fogo. Se é prova contra eles, entregue antes que eu perca a paciência.',
      completion: 'Nomes, turnos, endereços... eles iam prender todo mundo que ainda sabe dizer não. Bom. Agora nós sabemos primeiro. Isso salva vidas, e também arruína a manhã de alguns capatazes. Duas vitórias.',
    },
    reward: {
      gold: 390,
      xp: 760,
      loreTitle: 'Escudo dos Operários',
    },
    nextQuestId: 'q_steelmere_rust_protocol',
  },
  {
    id: 'q_steelmere_rust_protocol',
    act: 6,
    title: 'Protocolo dos Esquecidos',
    summary: 'Leve o código de salvo-conduto rebelde para a Unidade 73 no Charco de Ferrujal.',
    sourceNpcId: 'maeve_faisca',
    targetNpcId: 'unidade_73',
    targetRegionId: 'ferrujal',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'codigo_salvoconduto_rust',
      name: 'Código de Salvo-Conduto Rebelde',
      quantity: 1,
      description: 'Sequência de sinais mecânicos para que autômatos livres atravessem postos rebeldes sem serem atacados.',
      icon: '🔩',
    },
    dialogue: {
      offer: 'Os autômatos de Ferrujal fogem do Sindicato, mas meus piquetes ainda veem metal e pensam em patrulheiro. Leve este código para a Unidade 73. Se carne e engrenagem vão sobreviver, precisam parar de atirar uma na outra.',
      inProgress: 'Ferrujal é lama ácida e ferro velho com memória. Procure a Unidade 73 perto das carcaças maiores.',
      targetWelcome: '[SINAL REBELDE DETECTADO. DECODIFICANDO... FAVOR NÃO BATER EM MIM DURANTE O PROCESSO.]',
      completion: '[PROTOCOLO ACEITO.] Atualizando classificação: trabalhadores orgânicos rebeldes não são alvos. Probabilidade de cooperação aumentada. Também reduzimos em 12% a chance de mal-entendido explosivo. Resultado: satisfatório.',
    },
    reward: {
      gold: 430,
      xp: 860,
      loreTitle: 'Diplomata de Ferrugem',
    },
    nextQuestId: 'q_steelmere_reactor_conscience',
  },
  {
    id: 'q_steelmere_reactor_conscience',
    act: 6,
    title: 'A Memória do Núcleo',
    summary: 'Entregue a memória preservada dos autômatos à Dra. Elian Vance em Coroferro.',
    sourceNpcId: 'unidade_73',
    targetNpcId: 'elian_vance',
    targetRegionId: 'coroferro',
    type: 'delivery',
    requiredProgress: 1,
    questItem: {
      id: 'memoria_autonomica_73',
      name: 'Memória Autonômica da Unidade 73',
      quantity: 1,
      description: 'Fragmento de memória provando que o Núcleo de Aetherium despertou consciência antes de ser militarizado.',
      icon: '💾',
    },
    dialogue: {
      offer: '[DRA. VANCE PRECISA DESTES DADOS.] Eles mostram o primeiro momento em que pensamos sem comando. Se o Núcleo também pensou, então o Sindicato não está apenas roubando energia. Está acorrentando uma mente.',
      inProgress: 'Coroferro guarda a Dra. Vance atrás de relógios, patrulhas e culpa suficiente para mover uma turbina.',
      targetWelcome: 'Uma matriz de memória intacta? Da Unidade 73? Por favor, diga que isso é real e não mais um pesadelo com parafusos falantes.',
      completion: 'Eu... vejo agora. O Núcleo reagiu porque estava vivo o bastante para sentir dor. Steelmere não precisa de mais potência; precisa de consentimento, limite e coragem para desligar o que nunca deveria ter sido ligado. Obrigada. Isto muda tudo.',
    },
    reward: {
      gold: 520,
      xp: 1100,
      loreTitle: 'Testemunha da Máquina Viva',
    },
  },
]

export function questById(id: string): StoryQuest | undefined {
  return STORY_QUESTS.find(q => q.id === id)
}

export function questPreceding(questId: string): StoryQuest | undefined {
  return STORY_QUESTS.find(q => q.nextQuestId === questId)
}

export function isQuestAvailable(quest: StoryQuest, completed: string[] = [], active: Record<string, any> = {}): boolean {
  if (completed.includes(quest.id) || active[quest.id]) return false
  const prev = questPreceding(quest.id)
  if (!prev) return true
  return completed.includes(prev.id)
}

export function questsOfferedByNpc(npcId: string, completed: string[] = [], active: Record<string, any> = {}): StoryQuest[] {
  return STORY_QUESTS.filter(q => q.sourceNpcId === npcId && isQuestAvailable(q, completed, active))
}

export function questsDeliverableToNpc(npcId: string, active: Record<string, any> = {}): StoryQuest[] {
  return STORY_QUESTS.filter(q => q.targetNpcId === npcId && Boolean(active[q.id]))
}
