import type { Equipment, Rarity } from '../types'

type ClassId = 'guerreiro' | 'guardiao' | 'cacadora' | 'arcanista'
type Row = [string, string, string]

const rarities: Rarity[] = ['comum', 'incomum', 'raro', 'raro', 'epico', 'incomum', 'epico', 'lendario']
const prices = [13, 17, 21, 24, 29, 19, 27, 40]

const make = (classe: ClassId, tipo: string, rows: Row[]): Equipment[] => rows.map(([id, nome, file], i) => {
  const heavy = classe === 'guardiao'
  const light = classe === 'cacadora'
  const arcane = classe === 'arcanista'
  const vida = (heavy ? 2 : light ? 0 : 1) + Math.floor(i / 4)
  const defesa = (heavy ? 2 : light ? 0 : arcane ? 0 : 1) + i
  const image = `assets/art/hd/boots/${file}`
  return {
    id,
    nome,
    slot: 'botas',
    preco: prices[i],
    ataque: 0,
    vida,
    defesa,
    habilidade: `Passos de ${nome}: calçado exclusivo que aprimora a mobilidade da classe.`,
    imagem: image,
    arte: image,
    raridade: rarities[i],
    classeExclusiva: classe,
    tipoEquipamento: tipo,
  }
})

export const CLASS_BOOTS: Equipment[] = [
  ...make('guerreiro', 'botas_medias', [
    ['boots_war_valoria', 'Botas do Leão de Valoria', 'war_valoria.webp'],
    ['boots_war_sol', 'Botas do Juramento Solar', 'war_sol.webp'],
    ['boots_war_estrada', 'Botas da Estrada Real', 'war_estrada.webp'],
    ['boots_war_falcao', 'Botas do Falcão Branco', 'war_falcao.webp'],
    ['boots_war_cinzas', 'Botas das Cinzas Eternas', 'war_cinzas.webp'],
    ['boots_war_juramento', 'Botas do Juramento Rubro', 'war_juramento.webp'],
    ['boots_war_lua', 'Botas da Lua de Ferro', 'war_lua.webp'],
    ['boots_war_cavaleiro', 'Botas do Último Cavaleiro', 'war_cavaleiro.webp'],
  ]),
  ...make('guardiao', 'botas_pesadas', [
    ['boots_guard_khardur', 'Botas Pesadas de Kholgard', 'guard_khardur.webp'],
    ['boots_guard_montanha', 'Botas da Montanha Imóvel', 'guard_montanha.webp'],
    ['boots_guard_forja', 'Botas da Forja Profunda', 'guard_forja.webp'],
    ['boots_guard_bastiao', 'Botas do Bastião Anão', 'guard_bastiao.webp'],
    ['boots_guard_geada', 'Botas da Geada Azul', 'guard_geada.webp'],
    ['boots_guard_runico', 'Botas do Guardião Rúnico', 'guard_runico.webp'],
    ['boots_guard_bronze', 'Botas do Coração de Bronze', 'guard_bronze.webp'],
    ['boots_guard_muralha', 'Botas da Última Muralha', 'guard_muralha.webp'],
  ]),
  ...make('cacadora', 'botas_furtivas', [
    ['boots_rogue_raposa', 'Botas da Raposa Cinzenta', 'rogue_raposa.webp'],
    ['boots_rogue_contrabandista', 'Botas do Contrabandista', 'rogue_contrabandista.webp'],
    ['boots_rogue_lua', 'Botas da Lua Velada', 'rogue_lua.webp'],
    ['boots_rogue_aranha', 'Botas da Aranha Negra', 'rogue_aranha.webp'],
    ['boots_rogue_beco', 'Botas do Beco Sem Saída', 'rogue_beco.webp'],
    ['boots_rogue_moedas', 'Botas das Moedas Falsas', 'rogue_moedas.webp'],
    ['boots_rogue_fantasma', 'Botas do Passo Fantasma', 'rogue_fantasma.webp'],
    ['boots_rogue_rei', 'Botas do Rei dos Ladrões', 'rogue_rei.webp'],
  ]),
  ...make('arcanista', 'botas_arcanas', [
    ['boots_arc_estrelas', 'Botas das Sete Estrelas', 'arc_estrelas.webp'],
    ['boots_arc_chama', 'Botas da Chama Silenciosa', 'arc_chama.webp'],
    ['boots_arc_veu', 'Botas do Véu Violeta', 'arc_veu.webp'],
    ['boots_arc_runas', 'Botas das Runas Quebradas', 'arc_runas.webp'],
    ['boots_arc_tempestade', 'Botas da Tempestade Azul', 'arc_tempestade.webp'],
    ['boots_arc_tempo', 'Botas do Tempo Perdido', 'arc_tempo.webp'],
    ['boots_arc_lua', 'Botas da Lua Morta', 'arc_lua.webp'],
    ['boots_arc_primeiro', 'Botas do Primeiro Mago', 'arc_primeiro.webp'],
  ]),
]
