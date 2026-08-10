import type { Equipment, Rarity } from '../types'

type ClassId='guerreiro'|'guardiao'|'cacadora'|'arcanista'
type HeadRow=[string,string,string]
const progression=[
 {preco:14,vida:1,defesa:1,raridade:'comum'}, {preco:18,vida:1,defesa:1,raridade:'incomum'},
 {preco:22,vida:2,defesa:1,raridade:'raro'}, {preco:25,vida:1,defesa:2,raridade:'raro'},
 {preco:29,vida:2,defesa:2,raridade:'epico'}, {preco:20,vida:2,defesa:1,raridade:'incomum'},
 {preco:27,vida:2,defesa:2,raridade:'raro'}, {preco:42,vida:4,defesa:3,raridade:'lendario'}
] as const
const make=(classe:ClassId,tipo:string,rows:HeadRow[]):Equipment[]=>rows.map(([id,nome,file],i)=>{const p=progression[i];return{id,nome,slot:'capacete',preco:p.preco,ataque:0,vida:p.vida,defesa:p.defesa,habilidade:`Proteção de ${nome}: reforça a defesa e a identidade da classe.`,imagem:`assets/art/hd/headgear/${file}`,arte:`assets/art/hd/headgear/${file}`,raridade:p.raridade as Rarity,classeExclusiva:classe,tipoEquipamento:tipo}})

export const CLASS_HEADGEAR:Equipment[]=[
 ...make('guerreiro','elmo_guerreiro',[
  ['elmo_leao_valoria','Elmo do Leão de Valoria','war_valoria.webp'],['elmo_juramento_solar','Elmo do Juramento Solar','war_sol.webp'],['elmo_estrada_real','Elmo da Estrada Real','war_estrada.webp'],['elmo_falcao_branco','Elmo do Falcão Branco','war_falcao.webp'],['elmo_cinzas_eternas','Elmo das Cinzas Eternas','war_cinzas.webp'],['elmo_juramento_rubro','Elmo do Juramento Rubro','war_juramento.webp'],['elmo_lua_ferro','Elmo da Lua de Ferro','war_lua.webp'],['elmo_ultimo_cavaleiro','Elmo do Último Cavaleiro','war_cavaleiro.webp']]),
 ...make('guardiao','elmo_pesado',[
  ['elmo_khardur','Elmo Pesado de Khar-Dur','guard_khardur.webp'],['elmo_montanha_imovel','Elmo da Montanha Imóvel','guard_montanha.webp'],['elmo_forja_profunda','Elmo da Forja Profunda','guard_forja.webp'],['elmo_bastiao_anao','Elmo do Bastião Anão','guard_bastiao.webp'],['elmo_geada_azul','Elmo da Geada Azul','guard_geada.webp'],['elmo_guardiao_runico','Elmo do Guardião Rúnico','guard_runico.webp'],['elmo_coracao_bronze','Elmo do Coração de Bronze','guard_bronze.webp'],['elmo_ultima_muralha','Elmo da Última Muralha','guard_muralha.webp']]),
 ...make('cacadora','capuz_mascara',[
  ['capuz_raposa','Capuz da Raposa Cinzenta','rogue_raposa.webp'],['mascara_contrabandista','Máscara do Contrabandista','rogue_contrabandista.webp'],['capuz_lua_velada','Capuz da Lua Velada','rogue_lua.webp'],['mascara_aranha','Máscara da Aranha Negra','rogue_aranha.webp'],['capuz_beco','Capuz do Beco Sem Saída','rogue_beco.webp'],['mascara_moedas','Máscara das Moedas Falsas','rogue_moedas.webp'],['capuz_passo_fantasma','Capuz do Passo Fantasma','rogue_fantasma.webp'],['mascara_rei_ladroes','Máscara do Rei dos Ladrões','rogue_rei.webp']]),
 ...make('arcanista','diadema_arcano',[
  ['diadema_estrelas','Diadema das Sete Estrelas','arc_estrelas.webp'],['diadema_chama','Diadema da Chama Silenciosa','arc_chama.webp'],['coroa_veu','Coroa do Véu Violeta','arc_veu.webp'],['diadema_runas','Diadema das Runas Quebradas','arc_runas.webp'],['coroa_tempestade','Coroa da Tempestade Azul','arc_tempestade.webp'],['diadema_tempo','Diadema do Tempo Perdido','arc_tempo.webp'],['coroa_lua_morta','Coroa da Lua Morta','arc_lua.webp'],['diadema_primeiro_arcanista','Diadema do Primeiro Arcanista','arc_primeiro.webp']])
]
