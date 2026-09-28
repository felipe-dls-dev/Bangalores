// A Bíblia de narrativa (docs/PLANO_MESTRE_NARRATIVA_MUNDO.md) em forma de dados: os 7 atos da
// campanha, a teia social dos NPCs (laços + motivação oculta), o "eco no mundo" dos itens
// mnemônicos e os três desfechos da escolha final. Nada aqui mexe em combate: é tudo texto que as
// telas (diálogo de NPC, Diário de Missões, comparação de equipamentos) leem conforme o progresso.
// Os ids de NPC, item e missão são validados em qa-verification.test.ts.

import type { StoryQuest } from './storyQuests'

export interface StoryAct {
  act: number
  title: string
  levels: [number, number]
  route: string
  stakes: string
}

export const STORY_ACTS: StoryAct[] = [
  { act: 1, title: 'A Febre das Planícies', levels: [1, 12], route: 'Alvora → Abdendriel', stakes: 'Uma névoa ciana metálica adoece as fontes das planícies, e bandoleiros atacam comboios em busca de remédio.' },
  { act: 2, title: 'As Vozes de Ferro', levels: [12, 22], route: 'Kaldrum → Kholgard', stakes: 'Perfurações que não são de origem anã abalam as montanhas e roubam o Ferro Estelar.' },
  { act: 3, title: 'A Cinza e a Capela', levels: [20, 36], route: 'Morvath → Ignaris', stakes: 'As brocas romperam os selos das catacumbas, e os mortos de Morvath despertaram.' },
  { act: 4, title: 'O Rasgo do Sol Negro', levels: [32, 52], route: 'Sol Negro → Frostgard', stakes: 'Malgor se alimenta de uma ferida aberta por cabos que vêm do outro lado do mar.' },
  { act: 5, title: 'A Grande Travessia', levels: [40, 60], route: 'Frostgard → Trilhouro', stakes: 'Um mundo de vapor, sirenes e guardas do Sindicato do Latão — e uma rebelião esperando um aliado.' },
  { act: 6, title: 'A Fornalha dos Esquecidos', levels: [56, 72], route: 'Vulcannis → Ferrujal', stakes: 'O Sindicato força as caldeiras a níveis catastróficos para acelerar o dreno de Havendown.' },
  { act: 7, title: 'O Pulso de Dois Mundos', levels: [66, 100], route: 'Coroferro → Aetherium', stakes: 'O reator que drena Havendown é uma consciência aprisionada, e alguém precisa decidir o destino dela.' },
]

export function storyAct(act: number): StoryAct | undefined {
  return STORY_ACTS.find(a => a.act === act)
}

// ------------------------------------------------------------------
// Teia social: cada NPC conhece alguém em outra região. A motivação é
// "oculta" — só aparece depois que o herói conclui uma missão de
// história que passe por aquele NPC (ver npcTrustEarned).
// ------------------------------------------------------------------

export interface NpcLink {
  npcId: string
  relacao: string
}

export interface NpcLore {
  motivacao: string
  lacos: NpcLink[]
}

export const NPC_LORE: Record<string, NpcLore> = {
  brenna_ashcombe: {
    motivacao: 'Proteger os mercenários órfãos da guerra das sombras. Cada contrato perigoso que ela recusa a um novato é um caixão que ela não quer ver voltando.',
    lacos: [
      { npcId: 'toby_harlan', relacao: 'Fornece as lâminas da Guilda' },
      { npcId: 'colm_aldric', relacao: 'Mantém a Guilda de armadura (com três dedos tortos)' },
      { npcId: 'sela_hartwin', relacao: 'Boticária da Guilda e a única que a faz rir' },
      { npcId: 'gideon_mascarado', relacao: 'Velho companheiro de juramento que ela jura ter esquecido' },
    ],
  },
  toby_harlan: {
    motivacao: 'Virar fornecedor oficial da Guilda e provar a Brenna que não é só um vendedor de cebolas bem afiadas.',
    lacos: [
      { npcId: 'brenna_ashcombe', relacao: 'A chefe que ele tenta impressionar todo santo dia' },
      { npcId: 'colm_aldric', relacao: 'Vizinho de banca: dividem clientes e acidentes' },
    ],
  },
  colm_aldric: {
    motivacao: 'Pagar o barril. Ninguém sabe exatamente o que aconteceu com o barril, mas Colm continua pagando por ele.',
    lacos: [
      { npcId: 'brenna_ashcombe', relacao: 'Ela nunca o demitiu, e ele nunca perguntou por quê' },
      { npcId: 'toby_harlan', relacao: 'Vizinho de banca e testemunha do incidente' },
    ],
  },
  sela_hartwin: {
    motivacao: 'Descobrir a cura da febre ciana antes que ela alcance sua vila natal, rio abaixo das planícies.',
    lacos: [
      { npcId: 'lyriel_noite', relacao: 'Amizade e alerta: trocam cartas sobre as águas envenenadas' },
      { npcId: 'brenna_ashcombe', relacao: 'Abastece a Guilda de poções e de conselhos não pedidos' },
    ],
  },
  lyriel_noite: {
    motivacao: 'Impedir que a drenagem da seiva desperte a Matriarca Corrompida adormecida sob as raízes de Abdendriel.',
    lacos: [
      { npcId: 'sela_hartwin', relacao: 'Confia no antídoto dela mais do que em muitos druidas' },
      { npcId: 'kip_ligeiro', relacao: 'Seu batedor: medroso, mas os olhos mais rápidos da mata' },
    ],
  },
  kip_ligeiro: {
    motivacao: 'Sobreviver tempo suficiente para reencontrar o irmão, que desceu às minas de Kaldrum e parou de escrever.',
    lacos: [
      { npcId: 'lyriel_noite', relacao: 'A mestra a quem presta contas (e pede para recuar)' },
      { npcId: 'torvald_barbaneve', relacao: 'Leva a Torvald os avisos sobre as máquinas da fronteira' },
    ],
  },
  torvald_barbaneve: {
    motivacao: 'Fornecer metal rúnico a quem defende a superfície e descobrir o que está cavando por baixo das minas dele.',
    lacos: [
      { npcId: 'kip_ligeiro', relacao: 'O batedor que traz notícias das máquinas' },
      { npcId: 'borin_fenrick', relacao: 'Envia Ferro Estelar para a forja de Borin' },
      { npcId: 'astrid_reclusa', relacao: 'Vizinha de montanha; ele finge não acreditar nas previsões dela' },
    ],
  },
  astrid_reclusa: {
    motivacao: 'Provar que o "eclipse de ferro" que ela vê nas estrelas é real antes que alguém a chame de louca de novo.',
    lacos: [
      { npcId: 'torvald_barbaneve', relacao: 'Vizinho barulhento das minas' },
      { npcId: 'oraculo_danika', relacao: 'A única que entende a geometria do que ela vê no céu' },
    ],
  },
  borin_fenrick: {
    motivacao: 'Honrar o pacto com os reis antigos de Kholgard e forjar a arma do Escolhido, se um dia o Escolhido aparecer.',
    lacos: [
      { npcId: 'torvald_barbaneve', relacao: 'Recebe dele o Ferro Estelar e reclama do frete' },
      { npcId: 'padre_lucian', relacao: 'Forja os amuletos que mantêm quietos os mortos de Morvath' },
    ],
  },
  padre_lucian: {
    motivacao: 'Salvar as almas dos batedores caídos e lacrar de novo as catacumbas que as brocas abriram.',
    lacos: [
      { npcId: 'borin_fenrick', relacao: 'O ferreiro dos amuletos sagrados' },
      { npcId: 'alaric_thorne', relacao: 'Leva a ele as Cinzas Purificadas para o fogo de Ignaris' },
      { npcId: 'gideon_mascarado', relacao: 'O vizinho que saqueia túmulos; Lucian reza por ele mesmo assim' },
    ],
  },
  gideon_mascarado: {
    motivacao: 'Pagar uma dívida antiga com a Guilda que abandonou, sem que ninguém descubra quem está por trás da máscara.',
    lacos: [
      { npcId: 'brenna_ashcombe', relacao: 'Juraram juntos na Primeira Guarda; nenhum dos dois admite' },
      { npcId: 'padre_lucian', relacao: 'O padre que finge não ver o que ele desenterra' },
    ],
  },
  alaric_thorne: {
    motivacao: 'Forjar ligas à prova do fogo vil do eclipse antes que ele alcance os portões de Ignaris.',
    lacos: [
      { npcId: 'padre_lucian', relacao: 'Tempera armaduras com as cinzas que Lucian purifica' },
      { npcId: 'oraculo_danika', relacao: 'Envia a ela o Catalisador Ígneo que mantém o véu aberto' },
      { npcId: 'cassian_draye', relacao: 'Rival de forja no mesmo Pico' },
    ],
  },
  cassian_draye: {
    motivacao: 'Forjar uma lâmina que o dragão Ignaroth não consiga derreter, sem nunca admitir que precisou de ajuda.',
    lacos: [
      { npcId: 'ophira_vane', relacao: 'Alquimista que ele chama de perigosa e consulta escondido' },
      { npcId: 'alaric_thorne', relacao: 'Rival que disputa o calor da mesma montanha' },
    ],
  },
  ophira_vane: {
    motivacao: 'Destilar o fogo primordial sem explodir a oficina. Ou, pelo menos, sem explodir de novo.',
    lacos: [
      { npcId: 'cassian_draye', relacao: 'Cliente orgulhoso demais para agradecer' },
      { npcId: 'alaric_thorne', relacao: 'Divide com ele a lava das caldeiras naturais' },
    ],
  },
  oraculo_danika: {
    motivacao: 'Revelar que a ameaça a Havendown não nasce no Sol Negro, e sim do outro lado do mar, em Steelmere.',
    lacos: [
      { npcId: 'alaric_thorne', relacao: 'O catalisador dele sustenta as visões dela' },
      { npcId: 'astrid_reclusa', relacao: 'Lê o céu que Astrid mede' },
      { npcId: 'vanya_mar', relacao: 'Guardam juntas o Selo dos Mares, a travessia secreta' },
    ],
  },
  vanya_mar: {
    motivacao: 'Fazer a ponte secreta entre os dissidentes dos dois continentes, um passageiro de cada vez.',
    lacos: [
      { npcId: 'oraculo_danika', relacao: 'O Selo dos Mares que as une atravessou a tempestade' },
      { npcId: 'silas_sterling', relacao: 'Entrega a ele os forasteiros de confiança' },
    ],
  },
  silas_sterling: {
    motivacao: 'Sabotar os comboios do Sindicato sem perder o emprego, nem a cabeça.',
    lacos: [
      { npcId: 'vanya_mar', relacao: 'Contato no porto de gelo' },
      { npcId: 'maeve_faisca', relacao: 'Aliança secreta: passa a ela as rotas dos trens' },
      { npcId: 'hamilton_cross', relacao: 'O patrão que ele teme e engana todos os dias' },
    ],
  },
  maeve_faisca: {
    motivacao: 'Libertar a classe operária de Steelmere e derrubar a tirania do latão.',
    lacos: [
      { npcId: 'silas_sterling', relacao: 'Informante nervoso e indispensável' },
      { npcId: 'ignatius_drake', relacao: 'Troca com ele válvulas térmicas por turnos seguros' },
      { npcId: 'garrick_laton', relacao: 'Aliado nas copas de Engrenverde' },
    ],
  },
  garrick_laton: {
    motivacao: 'Salvar o bosque sem desmontar as tubulações que ele mesmo projetou. Ele ainda acha que dá para ter os dois.',
    lacos: [
      { npcId: 'maeve_faisca', relacao: 'Parceira contra a poda das caldeiras' },
      { npcId: 'elian_vance', relacao: 'Estudou com ela antes de trocar o reator pelas árvores' },
    ],
  },
  ignatius_drake: {
    motivacao: 'Impedir a explosão térmica das fornalhas de Vulcannis, com todo mundo ainda lá dentro.',
    lacos: [
      { npcId: 'maeve_faisca', relacao: 'Protege os operários dela nas caldeiras' },
      { npcId: 'unidade_73', relacao: 'Envia células de energia para a colônia de Ferrujal' },
    ],
  },
  unidade_73: {
    motivacao: 'Provar que seres de silício e cobre têm dignidade e alma.',
    lacos: [
      { npcId: 'ignatius_drake', relacao: 'Fonte de células de energia. Classificação: amigo ruidoso.' },
      { npcId: 'elian_vance', relacao: 'Guarda para ela o cartão mestre do reator' },
    ],
  },
  elian_vance: {
    motivacao: 'Reverter o dano do reator que ela mesma projetou.',
    lacos: [
      { npcId: 'unidade_73', relacao: 'O autômato que guardou a memória do Núcleo' },
      { npcId: 'hamilton_cross', relacao: 'Confronto moral: o homem que financiou o projeto dela' },
      { npcId: 'diretor_vane', relacao: 'O único que pode lhe abrir a sala do reator' },
    ],
  },
  hamilton_cross: {
    motivacao: 'Lucrar com os dois lados, até perceber que ouro nenhum detém o fim do mundo.',
    lacos: [
      { npcId: 'silas_sterling', relacao: 'Funcionário exemplar (segundo ele)' },
      { npcId: 'elian_vance', relacao: 'A cientista que ele financiou e agora teme' },
    ],
  },
  diretor_vane: {
    motivacao: 'Manter o reator estável custe o que custar, até ser confrontado com a verdade.',
    lacos: [
      { npcId: 'elian_vance', relacao: 'Confia nos cálculos dela, não nos sentimentos' },
    ],
  },
}

// Um NPC confia no herói depois de uma missão de história concluída que passe por ele (como
// mandante ou destinatário). Quem não tem missão própria (Toby, Colm) confia assim que o herói
// resolve uma missão com alguém da mesma região: a notícia corre rápido numa praça pequena.
export function npcTrustEarned(
  npcId: string,
  quests: StoryQuest[],
  completed: string[],
  regionOf: (npcId: string) => string | undefined,
): boolean {
  const done = quests.filter(q => completed.includes(q.id))
  if (done.some(q => q.sourceNpcId === npcId || q.targetNpcId === npcId)) return true
  if (quests.some(q => q.sourceNpcId === npcId || q.targetNpcId === npcId)) return false
  const region = regionOf(npcId)
  return Boolean(region) && done.some(q => regionOf(q.sourceNpcId) === region || regionOf(q.targetNpcId) === region)
}

// ------------------------------------------------------------------
// Itens mnemônicos, camada 3 (eco no mundo): o NPC reconhece a peça
// que o herói está usando. A camada 2 (proveniência) é o campo
// `historia` do próprio equipamento.
// ------------------------------------------------------------------

export interface ItemEcho {
  itemId: string
  npcId: string
  fala: string
}

export const ITEM_ECHOES: ItemEcho[] = [
  { itemId: 'lamina_sentinela', npcId: 'borin_fenrick', fala: 'Essa bainha... você carrega a lâmina de Valerius. Ele morreu de pé nos portões. Não o envergonhe.' },
  { itemId: 'elmo_ferro', npcId: 'borin_fenrick', fala: 'Elmo de Kholgard. Liga boa. Se alguém tentar entrar na sua cabeça com magia, vai bater de testa no meu trabalho.' },
  { itemId: 'manto_cinzas', npcId: 'alaric_thorne', fala: 'O calor desse manto rivaliza com a minha própria fornalha! Um guerreiro digno de vestir as cinzas do dragão finalmente surgiu!' },
  { itemId: 'botas_brasa', npcId: 'cassian_draye', fala: 'Solas temperadas na lava do Pico. Finalmente alguém com bom gosto para pisar no que esta montanha forja, mesmo que não tenha sido eu a forjar.' },
  { itemId: 'coracao_malgor', npcId: 'oraculo_danika', fala: 'Esse pulso... é o coração dele. Malgor não morreu por inteiro enquanto você carregar isso perto do peito. Vigie seus sonhos.' },
  { itemId: 'retrato_rainha', npcId: 'brenna_ashcombe', fala: 'Esse é o retrato da Rainha Elisandra. Minha avó servia na corte dela. Se vender isso ao Gideon, eu fico sabendo. E você fica sem contratos.' },
  { itemId: 'escudo_carvalho', npcId: 'lyriel_noite', fala: 'O carvalho-ancião deixou você levar um pedaço dele? Então ele confia em você. Eu também. E vou pedir desculpas a ele pelos arranhões.' },
  { itemId: 'anel_luar', npcId: 'lyriel_noite', fala: 'Prata consagrada sob a lua cheia... esse anel já ouviu mais segredos das clareiras do que eu. Cuide bem dele. Ele escuta.' },
  { itemId: 'calcas_batedor', npcId: 'kip_ligeiro', fala: 'Calças de batedor! Fibra lunar! Você anda sem fazer barulho! Por favor, me ensina. Eu faço barulho até respirando.' },
  { itemId: 'machado_cinzento', npcId: 'torvald_barbaneve', fala: 'HA! Um machado das minas de Kaldrum! Racha rocha, racha ferro e, se você for como eu, racha a mesa do jantar quando se empolga!' },
  { itemId: 'frasco_sangue_troll', npcId: 'astrid_reclusa', fala: 'Sangue de troll das cavernas glaciais. As estrelas previram que alguém beberia isso. Não previram se daria certo.' },
  { itemId: 'capuz_sombras', npcId: 'padre_lucian', fala: 'Esse véu foi tecido com a névoa da fronteira proibida. Os mortos reconhecem o cheiro. Ande devagar entre as lápides e eles vão pensar que você é um deles.' },
  { itemId: 'foice_colheitas', npcId: 'gideon_mascarado', fala: 'Ametista de Morvath... conheço essa lapidação. Vendi esse cristal três vezes e ele sempre volta. Ou gosta de mim, ou é amaldiçoado. Provavelmente as duas coisas.' },
  { itemId: 'amuleto_orvalho', npcId: 'sela_hartwin', fala: 'Orvalho do solstício! Sabe quanto tempo eu levo para juntar uma gota dessas? Nem eu sei, sempre durmo antes da alvorada.' },
  { itemId: 'pederneira_ancestrais', npcId: 'toby_harlan', fala: 'Uma pederneira dos pioneiros de Alvora! Tem mais história nessa pedra do que em todas as que eu inventei para as minhas espadas. E eu invento MUITAS.' },
  { itemId: 'botas_viajante', npcId: 'colm_aldric', fala: 'Botas que cruzaram as sete regiões sem rasgar? Eu rasgo as minhas só de olhar para elas. Qual o segredo? Não conte ao barril.' },
  { itemId: 'facas_gemeas', npcId: 'vanya_mar', fala: 'Facas das docas. Cortes silenciosos. Você não é tão forasteiro quanto parece.' },
]

export function itemEchoesFor(npcId: string, equippedBaseIds: string[]): ItemEcho[] {
  return ITEM_ECHOES.filter(echo => echo.npcId === npcId && equippedBaseIds.includes(echo.itemId))
}

export function npcsWhoRecognize(itemId: string): string[] {
  return ITEM_ECHOES.filter(echo => echo.itemId === itemId).map(echo => echo.npcId)
}

// ------------------------------------------------------------------
// Escolha final (Ato 7): três caminhos, cada um com epílogo, título
// e a reação dos NPCs dos dois mundos depois do desfecho.
// ------------------------------------------------------------------

export type CampaignEndingId = 'harmonia' | 'soberania' | 'trono_vazio'

export interface CampaignEnding {
  id: CampaignEndingId
  title: string
  choice: string
  summary: string
  epilogue: string
  loreTitle: string
}

export const CAMPAIGN_ENDINGS: CampaignEnding[] = [
  {
    id: 'harmonia',
    title: 'Caminho da Harmonia Rúnico-Mecânica',
    choice: 'Sintonizar os monolitos de Havendown ao reator de Steelmere',
    summary: 'O dreno cessa, e magia e vapor passam a dividir a mesma corrente.',
    epilogue: 'Os monolitos de Havendown voltaram a cantar, agora no compasso das turbinas de Steelmere. As fontes de Alvora clarearam, Ferrujal ganhou energia limpa e, pela primeira vez, um quebra-gelos cruzou o Mar das Tormentas levando sementes em vez de minério. Ninguém sabe se a paz vai durar. Mas os dois mundos respiram no mesmo ritmo, e foi você quem ensinou o compasso.',
    loreTitle: 'Arauto da Harmonia',
  },
  {
    id: 'soberania',
    title: 'Caminho da Soberania Primordial',
    choice: 'Cortar para sempre os cabos submarinos',
    summary: 'Havendown recupera todo o seu Éter; Steelmere terá de viver dos próprios recursos.',
    epilogue: 'Os cabos afundaram no Mar das Tormentas, e o Éter voltou a correr pelos veios de Havendown como sangue novo. Abdendriel floresceu em uma única estação. Do outro lado do mar, as fornalhas de Steelmere esfriaram uma a uma: Maeve organiza cozinhas coletivas, Drake aprendeu a queimar menos e mais devagar, e Coroferro descobriu o valor de um relógio que atrasa. Foi justo. Não foi fácil.',
    loreTitle: 'Guardião da Soberania Primordial',
  },
  {
    id: 'trono_vazio',
    title: 'Caminho do Trono do Vazio',
    choice: 'Reivindicar para si a energia dos dois mundos',
    summary: 'Você se torna o Soberano Eterno, além da carne e da engrenagem.',
    epilogue: 'O reator se calou, não porque parou, mas porque passou a obedecer. A energia dos dois continentes corre agora por um único canal: você. As fornalhas acendem quando você permite; as florestas florescem quando você se lembra delas. Havendown e Steelmere estão em paz, do jeito que os súditos ficam em paz. Em algum lugar, o eco de Malgor ri baixinho.',
    loreTitle: 'Soberano do Vazio',
  },
]

export function campaignEndingById(id?: string): CampaignEnding | undefined {
  return CAMPAIGN_ENDINGS.find(ending => ending.id === id)
}

export const ENDING_FLAG_PREFIX = 'final:'

export function endingFromFlags(flags: string[] = []): CampaignEnding | undefined {
  const flag = flags.find(f => f.startsWith(ENDING_FLAG_PREFIX))
  return flag ? campaignEndingById(flag.slice(ENDING_FLAG_PREFIX.length)) : undefined
}

export const ENDING_REACTIONS: Record<string, Record<CampaignEndingId, string>> = {
  brenna_ashcombe: {
    harmonia: 'Contratos novos no quadro: "escoltar engenheiros de Steelmere até os monolitos". Nunca achei que ia escrever isso. Nunca achei que você ia voltar, também.',
    soberania: 'As fontes limparam e os novatos param de chegar tossindo. Não vou fazer discurso. Tome uma cerveja na conta da Guilda. Só uma.',
    trono_vazio: 'Metade da Guilda quer te coroar, a outra metade quer fugir para o sul. Eu? Eu continuo aqui. Alguém precisa lembrar quem você era antes.',
  },
  sela_hartwin: {
    harmonia: 'A febre ciana sumiu! Agora a água tem um levíssimo gosto de ferrugem. Tecnologia! Eu chamo de tempero.',
    soberania: 'A água voltou a ser só água! Minha vila natal mandou uma torta. Eu comi. Era para você. Desculpa.',
    trono_vazio: 'Ninguém mais adoece, é verdade. Também ninguém mais ri alto na praça. Estou vendendo poção de coragem para quem quer lembrar como se faz.',
  },
  lyriel_noite: {
    harmonia: 'As raízes sentem o pulso das máquinas distantes e... não reclamam. É estranho. É bonito. Estou aprendendo o nome das engrenagens.',
    soberania: 'A seiva voltou a brilhar. A Matriarca dorme em paz, e as árvores cantam uma música que eu não ouvia desde criança.',
    trono_vazio: 'A floresta floresce quando você passa, e murcha quando você esquece. As árvores não são mais livres. Nem eu.',
  },
  borin_fenrick: {
    harmonia: 'Mandaram um engenheiro de latão para aprender forja rúnica comigo. Ele fala demais. Mas martela direito. Isso basta.',
    soberania: 'O Ferro Estelar voltou a cantar na bigorna. Os reis antigos estariam satisfeitos. Eu estou. Não conte a ninguém.',
    trono_vazio: 'Você me pediu uma coroa. Forjei. Foi a peça mais bonita que já fiz, e a única de que me envergonho.',
  },
  oraculo_danika: {
    harmonia: 'O rasgo cicatrizou com uma costura de cobre. Não é como era. É como precisava ser.',
    soberania: 'O véu se fechou por completo. Pela primeira vez em anos, não vejo nada além do presente. É um alívio que eu não sabia que precisava.',
    trono_vazio: 'Eu vi este futuro muitas vezes. Em todas, eu tentava avisar. Em todas, você já sabia.',
  },
  vanya_mar: {
    harmonia: 'O quebra-gelos agora faz a rota duas vezes por semana, levando gente dos dois lados. Continua sem calefação. Algumas coisas não mudam.',
    soberania: 'Sem os cabos, o mar voltou a ser só mar. Sigo cruzando, levando quem precisa recomeçar em Havendown. Não perguntam muito. Eu também não.',
    trono_vazio: 'Recebi ordens para patrulhar os dois litorais em seu nome. Cumpro. O gelo não pergunta. Mas eu lembro.',
  },
  maeve_faisca: {
    harmonia: 'O Aetherium agora tem medidor público e conselho operário! Ainda discutimos por horas, mas ninguém mais morre de fuligem. Vitória!',
    soberania: 'Menos energia, mais trabalho braçal, e nenhum patrão sentado em cima da gente. Está difícil. Está nosso.',
    trono_vazio: 'Derrubamos um tirano de latão para ganhar um de Éter. Guardei as minhas faíscas. Um dia elas voltam a ser necessárias.',
  },
  unidade_73: {
    harmonia: '[ESTADO DO NÚCLEO: CONSENTIMENTO REGISTRADO.] Ele não sofre mais. Nós não somos mais descartados. Classificação desta era: esperança sustentável.',
    soberania: '[CABOS DESCONECTADOS.] O Núcleo dorme. A colônia opera com as células que você nos ajudou a guardar. Probabilidade de sobrevivência: suficiente. Gratidão: máxima.',
    trono_vazio: '[ALERTA: O NÚCLEO RESPONDE A UMA ÚNICA VONTADE.] Você libertou uma mente para acorrentar duas. Minha análise não encontra outra palavra para isso.',
  },
  elian_vance: {
    harmonia: 'Reescrevi as equações do reator com runas de Havendown nas margens. Meus colegas chamam de heresia. Eu chamo de revisão por pares.',
    soberania: 'Desliguei com minhas próprias mãos a máquina que construí. Dói. Mas pela primeira vez em anos eu durmo a noite inteira.',
    trono_vazio: 'Eu construí o reator para servir a um império. Ele agora serve a uma pessoa. Não sei qual dos dois erros é pior.',
  },
  hamilton_cross: {
    harmonia: 'Investi tudo em transporte intercontinental. Chamam de redenção; eu chamo de diversificação de carteira. Mas, entre nós... é redenção.',
    soberania: 'Minhas ações despencaram, meus relógios atrasam e eu nunca estive tão vivo. Vendi a mansão. Comprei uma horta.',
    trono_vazio: 'Enfim alguém que entende de monopólio! Pena que o monopólio agora inclui o meu cofre. E a mim.',
  },
  diretor_vane: {
    harmonia: 'O Núcleo pulsa em compasso com os monolitos. Estabilidade verdadeira não é controle; é concordância. Levei trinta anos para aprender isso com você.',
    soberania: 'O reator está em silêncio. Pela primeira vez, a sala de controle não tem nada a controlar. Descobri que sei ler livros.',
    trono_vazio: 'Mantenho o reator estável, como sempre fiz. Só que agora sei a quem ele obedece, e não durmo mais.',
  },
}

export function endingReaction(npcId: string, ending?: CampaignEnding): string | undefined {
  return ending ? ENDING_REACTIONS[npcId]?.[ending.id] : undefined
}
