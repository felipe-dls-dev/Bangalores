import {CRYSTAL_REWARDS} from './crystals'
import {fx,type StoryEffect} from './storyEffects'
import {STORY_EXPANSION_CHAPTERS} from './storyExpansion'
export type DifficultyMode='aventura'|'veterano'|'lendario'
export type Element='fisico'|'fogo'|'gelo'|'natureza'|'sombra'|'luz'|'arcano'
// Contrato 6 do Quadro de Contratos: "Aventura" já existia, mas só 12% mais fraco que o padrão
// não entregava "sem a pressão do combate" -- suavizado pra 40% mais fraco (perto do que um modo
// história de verdade precisa) e ganhou uma descrição própria, exibida na tela de Crônicas junto
// com os multiplicadores, pra deixar claro pra quem esse modo é.
export const DIFFICULTIES={
 aventura:{nome:'Aventura',enemy:.6,reward:1,descricao:'Foque na história: inimigos bem mais fracos, ideal pra acompanhar as Crônicas sem se preocupar com o combate.'},
 veterano:{nome:'Veterano',enemy:1,reward:1.12,descricao:'A experiência padrão do jogo, equilibrada entre desafio e recompensa.'},
 lendario:{nome:'Lendário',enemy:1.22,reward:1.32,descricao:'Inimigos mais fortes e recompensas maiores, para quem já domina o combate.'}
} as const
export const CLASS_IDENTITIES={guerreiro:{nome:'Mestre de Armas',texto:'Combos, contra-ataques e dano constante.',elemento:'fisico'},guardiao:{nome:'Bastião',texto:'Escudos, redução de dano e retaliação.',elemento:'luz'},cacadora:{nome:'Sombra Veloz',texto:'Críticos, sombras, esquiva e saque.',elemento:'sombra'},arcanista:{nome:'Tecelão Arcano',texto:'Elementos, controle e manipulação dos dados.',elemento:'arcano'}} as const
// Elemento de ataque/resistência associado a cada classe, usado para marcar armas e
// equipamentos de defesa gerados por classe (offhands, headgear, armorSets, legwear,
// boots, newClassEquipment) com o novo sistema elemental sem precisar editar item a item.
// Caçadora usa sombra (identidade "Sombra Veloz") em vez de natureza, para não duplicar o
// mesmo elemento/condição da Druida; Caçador usa gelo para não colidir com a Caçadora.
// Com 9 classes para 7 elementos, alguns pares dividem elemento de propósito — Guardião e
// Sacerdotisa (luz, ambos "protetores") e Arcanista e Conjurador (arcano, ambos conjuradores).
export const CLASS_ELEMENT:Record<'guerreiro'|'guardiao'|'cacadora'|'arcanista'|'druida'|'cacador'|'monge'|'sacerdotisa'|'conjurador',Element>={guerreiro:'fisico',guardiao:'luz',cacadora:'sombra',arcanista:'arcano',druida:'natureza',cacador:'gelo',monge:'fogo',sacerdotisa:'luz',conjurador:'arcano'}
// Escala junto com EQUIPMENT_LEVELS (game.ts) — 1 a 100 — em vez de parar no nível 14: os
// 6 talentos originais cobriam só os primeiros ~15 níveis de uma jornada de 100, deixando o
// resto da progressão sem nenhum talento novo pra desbloquear.
export const TALENTS=[
 {id:'vigor',nome:'Vigor do Aventureiro',texto:'+5 de vida máxima.',level:3},{id:'precisao',nome:'Precisão Mortal',texto:'+1 de Poder de ataque.',level:5},{id:'muralha',nome:'Muralha Interior',texto:'+1 de Vigor.',level:7},
 {id:'alquimista',nome:'Alquimista de Campo',texto:'Consumíveis restauram ou concedem +1 adicional.',level:9},{id:'cacador',nome:'Caçador de Tiranos',texto:'+2 de dano contra chefes.',level:11},{id:'destino',nome:'Senhor do Destino',texto:'+1 na primeira rolagem de cada combate.',level:14},
 {id:'reflexos',nome:'Reflexos Aguçados',texto:'+1 de Destreza.',level:20},{id:'poder_interior',nome:'Poder Interior',texto:'+1 de Poder de ataque.',level:30},{id:'resiliencia',nome:'Resiliência de Veterano',texto:'+8 de vida máxima.',level:45},
 {id:'instinto_predador',nome:'Instinto Predador',texto:'+2 de Poder de ataque.',level:60},{id:'guarda_ancestral',nome:'Guarda Ancestral',texto:'+2 de Vigor.',level:75},{id:'apice_heroico',nome:'Ápice Heroico',texto:'+15 de vida máxima.',level:90}
] as const
export const REGION_MATERIALS:Record<string,{id:string;nome:string;elemento:Element}>={campos_dourados:{id:'fibra_dourada',nome:'Fibra Dourada',elemento:'fisico'},floresta_lunargenta:{id:'seiva_lunar',nome:'Seiva Lunar',elemento:'natureza'},montanhas_cinzentas:{id:'minerio_cinzento',nome:'Minério Cinzento',elemento:'gelo'},pico_escarlate:{id:'escama_rubra',nome:'Escama Rubra',elemento:'fogo'},terras_mortas:{id:'essencia_sombria',nome:'Essência Sombria',elemento:'sombra'},khar_dur:{id:'runa_ana',nome:'Runa Anã',elemento:'luz'},coracao_eclipse:{id:'fragmento_eclipse',nome:'Fragmento do Sol Negro',elemento:'arcano'},
// Steelmere (mundo 'steelmere'): mesma cobertura de 1 material por região, ausente antes --
// vitórias em qualquer região de Steelmere caíam no fallback (Fibra Dourada, de Havendown).
frostgard:{id:'cristal_glacial',nome:'Cristal Glacial',elemento:'gelo'},engrenverde:{id:'seiva_encanada',nome:'Seiva Encanada',elemento:'natureza'},trilhouro:{id:'latao_ferroviario',nome:'Latão Ferroviário',elemento:'fisico'},vulcannis:{id:'escoria_vulcanica',nome:'Escória Vulcânica',elemento:'fogo'},ferrujal:{id:'oleo_corrosivo',nome:'Óleo Corrosivo',elemento:'sombra'},coroferro:{id:'engrenagem_real',nome:'Engrenagem Real',elemento:'luz'},aetherium:{id:'nucleo_etereo',nome:'Núcleo Etéreo',elemento:'arcano'}}
// Contrato 16 do Quadro de Contratos: temaLoot de cada sub-região (ex. "Machados, martelos e
// itens cerimoniais", "Runas e itens arcanos") sempre foi só texto de exibição, sem nenhuma
// ligação com o que a sub-região de fato larga. Em vez de mapear cada uma das ~75 frases livres
// (uma por sub-região, entre subregioes.json/expandedSubregions.ts/subregioesSteelmere.ts) pra um
// material próprio -- economia nova demais pra um contrato de esforço médio -- extrai a PRIMEIRA
// palavra-chave reconhecida de cada frase (ordem da lista importa: mais específica primeiro) e
// resolve pra um material pequeno e compartilhado entre todas as frases que citam aquele tema.
// Sub-regiões cujo temaLoot não bate com nenhuma palavra-chave simplesmente não geram bônus --
// sem fallback "genérico" que tornaria o vínculo com o texto real inexistente na prática.
export const SUBREGION_THEME_MATERIALS:Array<{match:RegExp;id:string;nome:string;elemento:Element}>=[
 {match:/couro/i,id:'couro_curtido',nome:'Couro Curtido',elemento:'fisico'},
 {match:/veneno|toxina|ácido|acido/i,id:'veneno_concentrado',nome:'Veneno Concentrado',elemento:'sombra'},
 {match:/machado|martelo/i,id:'aco_forjado',nome:'Aço Forjado',elemento:'fisico'},
 {match:/faca|adaga/i,id:'lamina_fragmentada',nome:'Lâmina Fragmentada',elemento:'fisico'},
 {match:/runa/i,id:'esquirla_runica',nome:'Esquirla Rúnica',elemento:'luz'},
 {match:/cristal/i,id:'cristal_bruto',nome:'Cristal Bruto',elemento:'gelo'},
 {match:/escama/i,id:'escama_menor',nome:'Escama Menor',elemento:'fogo'},
 {match:/essência|essencia|grimório|grimorio/i,id:'po_arcano',nome:'Pó Arcano',elemento:'arcano'},
 {match:/amuleto/i,id:'fragmento_de_amuleto',nome:'Fragmento de Amuleto',elemento:'luz'},
 {match:/óleo|oleo/i,id:'oleo_espesso',nome:'Óleo Espesso',elemento:'fogo'},
 {match:/seda/i,id:'fio_de_seda',nome:'Fio de Seda',elemento:'natureza'},
 {match:/núcleo|nucleo|engrenagem|latão|latao|vapor/i,id:'engrenagem_solta',nome:'Engrenagem Solta',elemento:'fisico'},
 {match:/fuligem|sucata/i,id:'sucata_enegrecida',nome:'Sucata Enegrecida',elemento:'sombra'},
]
export function subregionThemeMaterial(temaLoot:string|undefined){return temaLoot?SUBREGION_THEME_MATERIALS.find(m=>m.match.test(temaLoot)):undefined}
// Mesma ideia pro lado do equipamento: quando o temaLoot cita um tipo de arma/armadura que já
// existe no catálogo, o sorteio de item na sub-região prefere esse tipo em vez de qualquer coisa
// do nível/classe do herói -- reaproveita o catálogo existente (zero item novo), só reordena a
// chance. Padrões espelham os já usados por equipmentAffinity (game.ts) pra manter consistência.
export const SUBREGION_EQUIPMENT_KEYWORDS:Array<{theme:RegExp;item:RegExp}>=[
 {theme:/machado|martelo/i,item:/machado|martelo/i},
 {theme:/faca|adaga/i,item:/faca|adaga/i},
 {theme:/cajado|grimório|grimorio/i,item:/cajado|orbe/i},
 {theme:/arco|balestra/i,item:/arco|balestra/i},
 {theme:/escudo/i,item:/escudo/i},
 {theme:/armadura/i,item:/armadura|couraça|couraca|peitoral/i},
 {theme:/botas/i,item:/botas/i},
]
export function subregionEquipmentKeyword(temaLoot:string|undefined){return temaLoot?SUBREGION_EQUIPMENT_KEYWORDS.find(k=>k.theme.test(temaLoot))?.item:undefined}

// Contrato 47 do Quadro de Contratos: desafios diários/semanais leves, um motivo concreto pra
// voltar todo dia. Em vez de sortear e PERSISTIR uma lista de desafios ativos (que exigiria uma
// rotina de expiração/renovação em algum lugar), os desafios são DERIVADOS deterministicamente da
// data atual (dia desde a época Unix pro diário, semana ISO pro semanal) -- todo jogador vê os
// mesmos desafios no mesmo dia, e um novo conjunto "aparece" sozinho à meia-noite sem nenhum
// código de expiração: é só uma chave (id) diferente, que os Records de progresso/reivindicado
// (challengeProgress/challengeClaimed em game.ts) nunca viram até o metric bater de novo.
export type ChallengeMetric='combat_win'|'dungeon_win'|'guild_delivery'
interface ChallengeDef{metric:ChallengeMetric;target:number;label:string;reward:number}
const DAILY_CHALLENGE_POOL:ChallengeDef[]=[
 {metric:'combat_win',target:3,label:'Vença 3 combates',reward:25},
 {metric:'dungeon_win',target:1,label:'Vença 1 andar de masmorra infinita',reward:30},
 {metric:'combat_win',target:5,label:'Vença 5 combates',reward:35},
]
const WEEKLY_CHALLENGE_POOL:ChallengeDef[]=[
 {metric:'guild_delivery',target:1,label:'Entregue 1 missão da Guilda',reward:120},
 {metric:'dungeon_win',target:5,label:'Vença 5 andares de masmorra infinita',reward:150},
 {metric:'combat_win',target:20,label:'Vença 20 combates',reward:140},
]
const DAY_MS=86400000
// O dia dos desafios é o dia LOCAL do jogador. Antes era o dia UTC, então em Brasília (UTC-3) os
// desafios viravam às 21h. tzOffsetMinutes segue Date#getTimezoneOffset (minutos a oeste de UTC:
// 180 em Brasília) e é parâmetro para os testes não dependerem do fuso da máquina.
function tzOffsetOf(now:number){return new Date(now).getTimezoneOffset()}
function dayIndex(now:number,tzOffsetMinutes=tzOffsetOf(now)){return Math.floor((now-tzOffsetMinutes*60000)/DAY_MS)}
// Semana de segunda a domingo. O dia 0 do calendário Unix (1970-01-01) foi uma quinta-feira, então
// a virada da semana cai quando (dia+3) é múltiplo de 7 (segunda = dia 4); o cálculo antigo
// (dia/7) virava toda quinta apesar do comentário dizer segunda a domingo.
function weekIndex(now:number,tzOffsetMinutes=tzOffsetOf(now)){return Math.floor((dayIndex(now,tzOffsetMinutes)+3)/7)}
/** Milissegundos até os desafios diários trocarem (meia-noite local). */
export function msUntilChallengeReset(now=Date.now(),tzOffsetMinutes=tzOffsetOf(now)){
 const intoDay=(((now-tzOffsetMinutes*60000)%DAY_MS)+DAY_MS)%DAY_MS
 return DAY_MS-intoDay
}
export interface Challenge{id:string;kind:'daily'|'weekly';metric:ChallengeMetric;target:number;label:string;reward:number;crystals:number}
export function activeChallenges(now=Date.now(),tzOffsetMinutes=tzOffsetOf(now)):Challenge[]{
 const di=dayIndex(now,tzOffsetMinutes),wi=weekIndex(now,tzOffsetMinutes)
 const first=DAILY_CHALLENGE_POOL[di%DAILY_CHALLENGE_POOL.length],second=DAILY_CHALLENGE_POOL[(di+1)%DAILY_CHALLENGE_POOL.length]
 const weekly=WEEKLY_CHALLENGE_POOL[wi%WEEKLY_CHALLENGE_POOL.length]
 return[
  {id:`daily_a_${di}`,kind:'daily',...first,crystals:CRYSTAL_REWARDS.dailyChallenge},
  {id:`daily_b_${di}`,kind:'daily',...second,crystals:CRYSTAL_REWARDS.dailyChallenge},
  {id:`weekly_${wi}`,kind:'weekly',...weekly,crystals:CRYSTAL_REWARDS.weeklyChallenge}
 ]
}
export function bumpChallengeProgress(progress:Record<string,number>|undefined,metrics:ChallengeMetric[],now=Date.now()):Record<string,number>{
 if(!metrics.length)return progress??{}
 const result={...(progress??{})}
 for(const challenge of activeChallenges(now))if(metrics.includes(challenge.metric))result[challenge.id]=(result[challenge.id]??0)+1
 return result
}
export const SET_BONUSES=[{key:'lua',nome:'Regalia de Abdendriel',two:'+1 defesa',four:'+4 vida'},{key:'cinza',nome:'Arsenal das Cinzas',two:'+1 ataque',four:'primeiro ataque causa +2 de dano'},{key:'kh ar|khar|runa|bronze',nome:'Legado de Kholgard',two:'+3 vida',four:'+3 escudo inicial'},{key:'eclipse|véu|vazio',nome:'Vestes do Sol Negro',two:'+1 ataque',four:'+1 em rolagens contra chefes'}]
export interface SubclassChoice {
  id: string
  nome: string
  titulo: string
  texto: string
  passiva: string
  stats: {
    ataque?: number
    defesa?: number
    vida?: number
    crit?: number
    bossDamage?: number
  }
}

export const HERO_SUBCLASSES: Record<string, SubclassChoice[]> = {
  guerreiro: [
    {
      id: 'berserker',
      nome: 'Berserker',
      titulo: 'Fúria Desenfreada',
      texto: 'Abandona a cautela em favor de poder bruto e golpes vorazes.',
      passiva: '+4 de Poder de ataque e +8% de chance crítica.',
      stats: { ataque: 4, crit: 0.08 }
    },
    {
      id: 'gladiador',
      nome: 'Gladiador',
      titulo: 'Mestre da Arena',
      texto: 'Especialista em combate tático equilibrado, resistência e contra-ataques.',
      passiva: '+2 de Poder de ataque, +2 de Vigor e +6 de Vida.',
      stats: { ataque: 2, defesa: 2, vida: 6 }
    }
  ],
  guardiao: [
    {
      id: 'paladino',
      nome: 'Paladino',
      titulo: 'Arauto da Luz',
      texto: 'Canaliza poder sagrado para purificar inimigos e sustentar batalhas.',
      passiva: '+2 de Poder de ataque, +2 de Vigor e +12 de Vida.',
      stats: { ataque: 2, defesa: 2, vida: 12 }
    },
    {
      id: 'colosso',
      nome: 'Colosso',
      titulo: 'Muralha Viva',
      texto: 'Armadura pesada impenetrável e resiliência lendária contra qualquer impacto.',
      passiva: '+4 de Vigor e +16 de Vida.',
      stats: { defesa: 4, vida: 16 }
    }
  ],
  cacadora: [
    {
      id: 'assassina',
      nome: 'Assassina',
      titulo: 'Lâmina Letal',
      texto: 'Foco total em ataques furtivos devastadores e pontos vitais.',
      passiva: '+5 de Poder de ataque e +12% de chance crítica.',
      stats: { ataque: 5, crit: 0.12 }
    },
    {
      id: 'ladra_fantasma',
      nome: 'Ladra Fantasma',
      titulo: 'Sombra Ilusória',
      texto: 'Movimentos imprevisíveis, evasão impecável e golpes oportunistas.',
      passiva: '+2 de Poder de ataque, +2 de Vigor e +6% de chance crítica.',
      stats: { ataque: 2, defesa: 2, crit: 0.06 }
    }
  ],
  arcanista: [
    {
      id: 'mago_elemental',
      nome: 'Mago Elemental',
      titulo: 'Senhor dos Elementos',
      texto: 'Manipula forças destrutivas puras para incinerar e desintegrar oponentes.',
      passiva: '+4 de Poder de ataque e +3 de dano contra chefes.',
      stats: { ataque: 4, bossDamage: 3 }
    },
    {
      id: 'cronoturgo',
      nome: 'Cronoturgo',
      titulo: 'Tecelão do Tempo',
      texto: 'Dobra o fluxo temporal para mitigar impactos e encontrar aberturas perfeitas.',
      passiva: '+2 de Poder de ataque, +2 de Vigor e +8 de Vida.',
      stats: { ataque: 2, defesa: 2, vida: 8 }
    }
  ],
  druida: [
    {
      id: 'guardiao_bosque',
      nome: 'Guardião do Bosque',
      titulo: 'Protetor Ancestral',
      texto: 'Sintonizado com a casca ancestral de Abdendriel para suportar golpes severos.',
      passiva: '+2 de Poder de ataque, +2 de Vigor e +14 de Vida.',
      stats: { ataque: 2, defesa: 2, vida: 14 }
    },
    {
      id: 'predador_selvagem',
      nome: 'Predador Selvagem',
      titulo: 'Garras da Matilha',
      texto: 'Adota a fúria das feras predadoras para dilacerar a guarda inimiga.',
      passiva: '+4 de Poder de ataque e +8% de chance crítica.',
      stats: { ataque: 4, crit: 0.08 }
    }
  ],
  cacador: [
    {
      id: 'atirador_elite',
      nome: 'Atirador de Elite',
      titulo: 'Olho de Falcão',
      texto: 'Disparos cirúrgicos de longa distância que encontram brechas milimétricas.',
      passiva: '+5 de Poder de ataque e +10% de chance crítica.',
      stats: { ataque: 5, crit: 0.1 }
    },
    {
      id: 'mestre_feras',
      nome: 'Mestre das Feras',
      titulo: 'Líder da Alcateia',
      texto: 'Combate harmonioso em dupla, fortalecendo a si e sua resistência física.',
      passiva: '+2 de Poder de ataque, +2 de Vigor e +10 de Vida.',
      stats: { ataque: 2, defesa: 2, vida: 10 }
    }
  ],
  monge: [
    {
      id: 'mestre_chi',
      nome: 'Mestre do Chi',
      titulo: 'Harmonia Interior',
      texto: 'Canalização perfeita de energia espiritual tanto para ataque quanto contenção.',
      passiva: '+3 de Poder de ataque, +2 de Vigor e +8 de Vida.',
      stats: { ataque: 3, defesa: 2, vida: 8 }
    },
    {
      id: 'punho_dragao',
      nome: 'Punho do Dragão',
      titulo: 'Fúria Flamejante',
      texto: 'Estilo agressivo de ataques explosivos que incendeiam a arena de combate.',
      passiva: '+5 de Poder de ataque e +10% de chance crítica.',
      stats: { ataque: 5, crit: 0.1 }
    }
  ],
  sacerdotisa: [
    {
      id: 'inquisidora',
      nome: 'Inquisidora da Luz',
      titulo: 'Chama Purgadora',
      texto: 'Zelo inflexível que converte preces em dano punitivo contra o mal.',
      passiva: '+4 de Poder de ataque, +8% de chance crítica e +2 de dano contra chefes.',
      stats: { ataque: 4, crit: 0.08, bossDamage: 2 }
    },
    {
      id: 'alta_cleriga',
      nome: 'Alta Clériga',
      titulo: 'Bênção Radiante',
      texto: 'Dedicação sagrada à vida e proteção inabalável para si e seus aliados.',
      passiva: '+3 de Vigor e +16 de Vida.',
      stats: { defesa: 3, vida: 16 }
    }
  ],
  conjurador: [
    {
      id: 'necromante',
      nome: 'Necromante',
      titulo: 'Colhedor de Almas',
      texto: 'Comanda energias sombrias que ceifam a essência vital dos adversários.',
      passiva: '+4 de Poder de ataque, +8 de Vida e +3 de dano contra chefes.',
      stats: { ataque: 4, vida: 8, bossDamage: 3 }
    },
    {
      id: 'invocador_abissal',
      nome: 'Invocador Abissal',
      titulo: 'Arauto do Éter',
      texto: 'Comunhão profunda com o plano astral que amplifica resistência e presença.',
      passiva: '+2 de Poder de ataque, +3 de Vigor e +10 de Vida.',
      stats: { ataque: 2, defesa: 3, vida: 10 }
    }
  ]
}

export const SPECIALIZATION_CHOICES=[
 {level:10,options:[{id:'ofensiva',nome:'Caminho da Ruína',texto:'+5% de chance crítica.'},{id:'defensiva',nome:'Caminho da Guarda',texto:'+1 de Vigor.'},{id:'utilidade',nome:'Caminho do Destino',texto:'+5 de vida máxima.'}]},
 {level:25,options:[{id:'elemental',nome:'Domínio Elemental',texto:'Condições elementais duram um turno adicional.'},{id:'vital',nome:'Vontade Inabalável',texto:'+10 de vida máxima.'},{id:'tesouro',nome:'Olhar do Explorador',texto:'+10% de chance de espólio.'}]},
 {level:30,options:[{id:'subclasse_1',nome:'Subclasse Especializada A',texto:'Especialização heroica de Nível 30.'},{id:'subclasse_2',nome:'Subclasse Especializada B',texto:'Especialização heroica de Nível 30.'}]},
 {level:50,options:[{id:'carrasco',nome:'Carrasco de Tiranos',texto:'+3 de dano contra chefes.'},{id:'baluarte',nome:'Baluarte Vivo',texto:'+2 de Vigor.'},{id:'alquimia',nome:'Mestre Alquimista',texto:'Consumíveis recebem +2 de valor.'}]},
 {level:75,options:[{id:'lenda',nome:'Lenda de Havendown',texto:'+2 de Poder de ataque e +2 de Vigor.'},{id:'fênix',nome:'Pacto da Fênix',texto:'Sobrevive uma vez por combate com 20% da vida.'},{id:'fortuna',nome:'Fortuna Real',texto:'+20% de ouro e materiais.'}]}
] as const
export const BESTIARY_MILESTONES=[{wins:1,label:'Atributos revelados'},{wins:3,label:'Elemento e resistência revelados'},{wins:5,label:'+1 de dano contra esta criatura'}] as const
// Cada condição é aplicada por acertos do elemento correspondente (natureza, fogo, físico,
// gelo, sombra, luz, arcano) e pode ser bloqueada por resistência a esse mesmo elemento no
// equipamento de defesa.
// Toda condição elemental só pode ser aplicada por um golpe crítico (dado 6) do elemento
// correspondente, com 50% de chance mesmo assim, e dura exatamente 1 turno -- as descrições
// antigas ("por algumas rodadas") eram vagas o bastante pra soar como vários turnos.
export const STATUS_INFO=[['Envenenado (natureza)','Dano leve por 3 turnos; pressiona combates longos.'],['Pegando fogo (fogo)','Explosão intensa de dano durante 1 turno.'],['Sangrando (físico)','Dura 2 turnos e acumula dano em novas aplicações.'],['Congelado (gelo)','Penaliza ataque e defesa por 2 turnos.'],['Agarrado (sombra)','Penaliza as rolagens por 2 turnos.'],['Cego (luz)','Penaliza as rolagens durante 1 turno.'],['Atordoado (arcano)','Cancela a próxima defesa ou ação do afetado.']] as const
export const ELEMENTS:Element[]=['fisico','fogo','gelo','natureza','sombra','luz','arcano']
export const ELEMENT_ADVANTAGES: Record<Element, { strongAgainst: Element[]; weakAgainst: Element[] }> = {
  fogo: { strongAgainst: ['natureza'], weakAgainst: ['gelo'] },
  natureza: { strongAgainst: ['gelo'], weakAgainst: ['fogo'] },
  gelo: { strongAgainst: ['fogo'], weakAgainst: ['natureza'] },
  luz: { strongAgainst: ['sombra'], weakAgainst: ['arcano'] },
  sombra: { strongAgainst: ['arcano'], weakAgainst: ['luz'] },
  arcano: { strongAgainst: ['luz'], weakAgainst: ['sombra'] },
  fisico: { strongAgainst: [], weakAgainst: [] },
}
export const FORGE_MATERIALS=[{id:'fragmento_fisico',nome:'Fragmento Físico',texto:'Metal, couro e madeira recuperados.'},{id:'essencia_magica',nome:'Essência Mágica',texto:'Energia extraída de itens encantados.'}] as const
export const FORGE_GEMS=[
 {id:'rubi_forja',nome:'Rubi da Forja',stat:'ataque' as const,value:2,texto:'+2 de Poder de ataque'},
 {id:'safira_guardia',nome:'Safira da Guarda',stat:'defesa' as const,value:1,texto:'+1 de Armadura'},
 {id:'esmeralda_vital',nome:'Esmeralda Vital',stat:'vida' as const,value:4,texto:'+4 de Vida'},
 {id:'ametista_arcana',nome:'Ametista Arcana',stat:'rolagem' as const,value:1,texto:'+1 na primeira rolagem'}
] as const
export type ForgeEffect='critico'|'defesa_perfeita'|'sorte'|'critico_forjado'|'esquiva_forjada'|'cura_forjada'|'dano_critico_bonus'|'cura_bonus'
export type ForgeAttribute='ataque'|'defesa'|'vida'
export type ForgeBonus='critico_forjado'|'esquiva_forjada'|'cura_forjada'|'dano_critico_bonus'|'cura_bonus'
export type ForgeChoice=ForgeAttribute|ForgeBonus
export const FORGE_BONUS_MATERIAL:Record<ForgeBonus,string>={critico_forjado:'rubi_forja',dano_critico_bonus:'rubi_forja',esquiva_forjada:'safira_guardia',cura_forjada:'esmeralda_vital',cura_bonus:'esmeralda_vital'}
export const FORGE_BONUS_LABELS:Record<ForgeBonus,string>={critico_forjado:'5% de taxa crítica',esquiva_forjada:'5% de esquiva',cura_forjada:'5% de chance de curar',dano_critico_bonus:'+10% dano crítico',cura_bonus:'+10% de cura'}
export type ForgeRecipe={id:string;nome:string;equipmentId:string;raridade:string;materials:Record<string,number>;effect?:ForgeEffect;effectText?:string;attributeChoice?:boolean}
// Receitas artesanais originais, preservadas com seus materiais e efeitos únicos.
// O catálogo completo (uma receita por equipamento) é montado em ../data/forgeRecipes.ts,
// que mescla esta lista com receitas geradas a partir de src/store/game.ts's EQUIPMENT.
export const CURATED_FORGE_RECIPES:ForgeRecipe[]=[
 {id:'receita_couro',nome:'Armadura de Couro Reforçado',equipmentId:'armadura_couro',raridade:'Incomum',materials:{fragmento_fisico:4}},
 {id:'receita_facas',nome:'Facas Gêmeas Temperadas',equipmentId:'facas_gemeas',raridade:'Raro',materials:{fragmento_fisico:5,essencia_magica:2},effect:'critico',effectText:'+8% de chance de elevar ataques fortes a críticos'},
 {id:'receita_lamina',nome:'Lâmina do Sentinela Refinada',equipmentId:'lamina_sentinela',raridade:'Épico',materials:{fragmento_fisico:7,essencia_magica:4,safira_guardia:1},effect:'critico',effectText:'+12% de chance de crítico aprimorado'},
 {id:'receita_manto',nome:'Manto das Cinzas Vivas',equipmentId:'manto_cinzas',raridade:'Épico',materials:{fragmento_fisico:4,essencia_magica:6,rubi_forja:1},effect:'defesa_perfeita',effectText:'+10% de chance de transformar defesa forte em perfeita'},
 {id:'receita_orbe',nome:'Orbe da Colheita Refinado',equipmentId:'foice_colheitas',raridade:'Lendário',materials:{essencia_magica:8,esmeralda_vital:1,ametista_arcana:1},effect:'sorte',effectText:'+12% de chance de espólio e melhoria da qualidade'},
 {id:'receita_explorador',nome:'Relíquia do Explorador Afortunado',equipmentId:'amuleto_dragao',raridade:'Lendário',materials:{fragmento_fisico:5,essencia_magica:7,ametista_arcana:2},effect:'sorte',effectText:'+18% de chance e melhor qualidade de espólios'}
]

export type StoryRequirement={type:'victories'|'bosses'|'material'|'upgrade'|'region';amount:number;target?:string;label:string}
// Efeitos: vocabulário e tetos em storyEffects.ts; o desenho completo em docs/STORY_CHOICES_EXPANSION.md.
export type StoryChoice={id:string;text:string;next:string;consequence:string;effects?:StoryEffect[]}
export type StoryChapter={id:string;act:number;title:string;speaker:string;dialogue:string;region:string;requirement?:StoryRequirement;choices:StoryChoice[]}
export const STORY_CHAPTERS:StoryChapter[]=[
 {id:'prologo',act:1,title:'Cinzas sobre Havendown',speaker:'Brenna Ashcombe',region:'Planícies de Alvora',dialogue:'As rotas comerciais estão em silêncio e a febre ciana já chegou às fontes. Algo está reunindo as criaturas sob um mesmo estandarte. Descubra quem controla as estradas, e volte inteiro: a Guilda não reembolsa caixão.',requirement:{type:'victories',amount:3,label:'Derrote 3 inimigos'},choices:[{id:'juramento',text:'Jurar proteção aos camponeses',next:'agua_que_brilha',consequence:'A Guilda reconhecerá sua honra.',effects:fx('ouro:8','guilda:5')},{id:'pagamento',text:'Exigir pagamento pela investigação',next:'carga_sem_dono',consequence:'Você obtém recursos e segue a trilha do dinheiro até um informante suspeito.',effects:fx('ouro:18','ouroPct:10')}]},
 {id:'sinais_lua',act:1,title:'Sinais sob a Lua',speaker:'Mestra Lyriel',region:'Floresta de Abdendriel',dialogue:'Símbolos do Sol Negro foram gravados nas árvores... as raízes choram quando passo a mão neles. Preciso de Seiva Lunar para revelar a trilha oculta.',requirement:{type:'material',target:'seiva_lunar',amount:3,label:'Colete 3 Seivas Lunares'},choices:[{id:'ritual',text:'Entregar a seiva para o ritual',next:'diplomacia_goblin',consequence:'A trilha para as montanhas será revelada.',effects:fx('forja:5','custoMat:seiva_lunar:3')},{id:'guardar',text:'Guardar a seiva e seguir rastros',next:'predador_lunar',consequence:'Você preserva a seiva, mas enfrentará o predador.'}]},
 {id:'mercenario',act:1,title:'O Preço da Informação',speaker:'Gideon Mascarado',region:'Planícies de Alvora',dialogue:'Informação tem preço, e a minha vem com desconto para quem não pergunta de onde veio. Um capitão bandoleiro carrega o mapa das rotas secretas. Repare nas ferramentas do bando: selos de latão que nenhuma forja de Havendown sabe fundir.',requirement:{type:'bosses',amount:2,label:'Derrote 2 chefes'},choices:[{id:'guilda',text:'Entregar o mapa à Guilda',next:'diplomacia_goblin',consequence:'Sua cooperação abre as oficinas de Kholgard.',effects:fx('ouro:12','forja:5')},{id:'vender',text:'Vender uma cópia ao corretor',next:'predador_lunar',consequence:'Ouro imediato; a floresta ficará mais hostil.',effects:fx('ouro:28','ouroPct:10','hostil:floresta_lunargenta:10')}]},
 {id:'predador_lunar',act:2,title:'A Caçada Prateada',speaker:'Kip Pé-Ligeiro',region:'Floresta de Abdendriel',dialogue:'O predador que protege os símbolos precisa ser vencido antes que a trilha desapareça. Eu mostro onde ele dorme. De longe. De MUITO longe.',requirement:{type:'victories',target:'floresta_lunargenta',amount:5,label:'Vença 5 combates na Floresta de Abdendriel'},choices:[{id:'poupar',text:'Poupar a criatura ferida',next:'diplomacia_goblin',consequence:'A floresta concede sua bênção.',effects:fx('bencao:1','vida:4')},{id:'trofeu',text:'Tomar suas presas como troféu',next:'diplomacia_goblin',consequence:'Você obtém material adicional e mais espólio das caçadas.',effects:fx('saque:8','mat:seiva_lunar:1')}]},
 {id:'forja_runas',act:2,title:'A Forja que Recorda',speaker:'Borin Fenrick',region:'Kholgard',dialogue:'Estas runas falam de uma coroa partida. Aprimore uma arma; o metal revelará a memória que guarda. E não fale enquanto eu martelo.',requirement:{type:'upgrade',amount:2,label:'Aprimore 2 equipamentos na forja'},choices:[{id:'luz',text:'Temperar a arma sob a luz rúnica',next:'fogo_de_segunda_mao',consequence:'Você seguirá pelo Pico de Ignaris.',effects:fx('vigor:1')},{id:'sombra',text:'Usar um fragmento sombrio',next:'mortos_nao_pagam_aluguel',consequence:'Você ouvirá as vozes das Terras de Morvath.',effects:fx('crit:3')}]},
 {id:'chama_escarlate',act:3,title:'A Chama e a Coroa',speaker:'Ignaroth',region:'Pico de Ignaris',dialogue:'O dragão conhece o nome do inimigo, mas não entregará seu segredo sem um duelo digno.',requirement:{type:'region',target:'pico_escarlate',amount:2,label:'Derrote 2 chefes do Pico de Ignaris'},choices:[{id:'duelo',text:'Aceitar o duelo ritual',next:'fenix_presa',consequence:'Ignaroth respeita sua coragem.',effects:fx('chefes:2')},{id:'roubo',text:'Roubar a tabuleta durante o combate',next:'fenix_presa',consequence:'Você obtém a verdade, mas conquista um inimigo.',effects:fx('ataque:1','hostil:pico_escarlate:10')}]},
 {id:'mortos_falam',act:3,title:'Quando os Mortos Falam',speaker:'Padre Lucian',region:'Terras de Morvath',dialogue:'A coroa não pertence a um rei vivo. Traga Essência Sombria e eu mostrarei seu verdadeiro portador.',requirement:{type:'material',target:'essencia_sombria',amount:4,label:'Colete 4 Essências Sombrias'},choices:[{id:'ouvir',text:'Ouvir toda a profecia',next:'selos_rompidos',consequence:'Você conhece a fraqueza de Malgor.',effects:fx('dano:coracao_eclipse:10')},{id:'romper',text:'Romper o ritual antes do fim',next:'selos_rompidos',consequence:'Você evita a maldição, mas perde parte da profecia.',effects:fx('ouro:15','res:sombra:10')}]},
 {id:'coracao',act:4,title:'O Reino do Sol Negro',speaker:'Malgor',region:'Reino do Sol Negro',dialogue:'Todas as suas escolhas trouxeram você até mim. Havendown terá um soberano — resta decidir que tipo de lenda você será.',requirement:{type:'region',target:'coracao_eclipse',amount:4,label:'Derrote 4 chefes do Reino do Sol Negro'},choices:[{id:'selar',text:'Destruir a coroa e selar o Sol Negro',next:'epilogo_luz',consequence:'Havendown permanecerá livre.',effects:fx('vigor:1')},{id:'tomar',text:'Tomar a coroa para si',next:'epilogo_sombra',consequence:'O poder do Sol Negro terá um novo portador.',effects:fx('ataque:2')}]},
 {id:'epilogo_luz',act:5,title:'Amanhecer de Havendown',speaker:'Brenna Ashcombe',region:'Guilda',dialogue:'As estradas voltaram a respirar. Seu nome será lembrado não pelo poder que tomou, mas pelo que recusou. Só que a Oráculo Danika jura que a ferida veio do outro lado do mar. Descanse. Depois, atravesse.',choices:[{id:'atravessar_amanhecer',text:'Atravessar o mar',next:'carga_nao_declarada',consequence:'Steelmere espera do outro lado. Os cabos também.'}]},
 {id:'epilogo_sombra',act:5,title:'O Novo Trono',speaker:'A Coroa',region:'Reino do Sol Negro',dialogue:'A guerra terminou. Das sombras, uma nova ordem observa Havendown — e ela responde somente a você. Mas algo do outro lado do mar continua bebendo do mesmo poço de Éter.',choices:[{id:'atravessar_trono',text:'Atravessar o mar',next:'carga_nao_declarada',consequence:'O trono pode esperar. O poço de Éter, não.'}]},
 ...STORY_EXPANSION_CHAPTERS
]
