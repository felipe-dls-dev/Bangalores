import type { Equipment, Rarity } from '../types'

type ClassId='guerreiro'|'guardiao'|'cacadora'|'arcanista'
type Entry=[string,string,number,number,number,string,string,Rarity]
const make=(classe:ClassId,tipo:string,rows:Entry[]):Equipment[]=>rows.map(([id,nome,preco,vida,defesa,habilidade,file,raridade])=>({id,nome,slot:'mao_esquerda',preco,ataque:0,vida,defesa,habilidade,imagem:`assets/art/hd/offhands/${file}`,arte:`assets/art/hd/offhands/${file}`,raridade,classeExclusiva:classe,tipoEquipamento:tipo}))

export const CLASS_OFFHANDS:Equipment[]=[
 ...make('guerreiro','escudo_leve',[
  ['leve_valoria','Escudo Leve da Guarda de Valoria',16,1,1,'Postura real: proteção equilibrada.','leve_valoria.webp','incomum'],
  ['leve_sol','Escudo Leve do Sol Nascente',22,1,2,'Aurora defensiva: fortalece o primeiro bloqueio.','leve_sol.webp','raro'],
  ['leve_estrada','Escudo Leve da Estrada Real',13,1,1,'Marcha segura: proteção para longas viagens.','leve_estrada.webp','comum'],
  ['leve_falcao','Escudo Leve do Falcão Branco',25,2,2,'Asa veloz: preserva a mobilidade.','leve_falcao.webp','raro'],
  ['leve_cinzas','Escudo Leve das Cinzas',30,2,2,'Brasa guardiã: resiste ao primeiro impacto.','leve_cinzas.webp','epico'],
  ['leve_juramento','Escudo Leve do Juramento Rubro',19,2,1,'Voto de sangue: defesa cresce em perigo.','leve_juramento.webp','incomum'],
  ['leve_lua','Escudo Leve da Lua de Ferro',27,2,2,'Reflexo lunar: desvia energia hostil.','leve_lua.webp','raro'],
  ['leve_cavaleiro','Escudo Leve do Último Cavaleiro',41,4,3,'Última vigília: não abandona seu portador.','leve_cavaleiro.webp','lendario']]),
 ...make('guardiao','escudo_pesado',[
  ['pesado_khardur','Escudo Pesado de Khar-Dur',20,3,2,'Firmeza anã: defesa maciça.','pesado_khardur.webp','incomum'],
  ['pesado_montanha','Escudo Pesado da Montanha Imóvel',34,5,3,'Imóvel: absorve impactos devastadores.','pesado_montanha.webp','epico'],
  ['pesado_forja','Escudo Pesado da Forja Profunda',26,4,3,'Calor da forja: resistência ancestral.','pesado_forja.webp','raro'],
  ['pesado_bastiao','Escudo Pesado do Bastião Anão',29,4,3,'Portão de ferro: protege como uma muralha.','pesado_bastiao.webp','raro'],
  ['pesado_geada','Escudo Pesado da Geada Azul',23,3,3,'Geada: amortece o primeiro golpe.','pesado_geada.webp','raro'],
  ['pesado_runico','Escudo Pesado do Guardião Rúnico',32,4,4,'Selo protetor: runas reforçam a defesa.','pesado_runico.webp','epico'],
  ['pesado_bronze','Escudo Pesado do Coração de Bronze',18,3,2,'Coração firme: aumenta a vida máxima.','pesado_bronze.webp','incomum'],
  ['pesado_muralha','Escudo Pesado da Última Muralha',46,6,5,'Inquebrável: defesa suprema de Khar-Dur.','pesado_muralha.webp','lendario']]),
 ...make('cacadora','broquel',[
  ['broquel_raposa','Broquel da Raposa Cinzenta',14,0,1,'Astúcia: defesa sem perder agilidade.','broquel_raposa.webp','comum'],
  ['broquel_contrabandista','Broquel do Contrabandista',18,1,1,'Compartimento secreto: guarda recursos.','broquel_contrabandista.webp','incomum'],
  ['broquel_lua','Broquel da Lua Velada',24,1,2,'Passo lunar: melhora a esquiva.','broquel_lua.webp','raro'],
  ['broquel_aranha','Broquel da Aranha Negra',29,1,2,'Teia defensiva: prende o ataque inimigo.','broquel_aranha.webp','epico'],
  ['broquel_beco','Broquel do Beco Sem Saída',16,1,1,'Sobrevivente: eficaz em espaços apertados.','broquel_beco.webp','incomum'],
  ['broquel_moedas','Broquel das Moedas Falsas',21,1,1,'Truque dourado: confunde o adversário.','broquel_moedas.webp','raro'],
  ['broquel_fantasma','Broquel do Passo Fantasma',27,2,2,'Intangível: reduz o primeiro dano.','broquel_fantasma.webp','raro'],
  ['broquel_rei','Broquel do Rei dos Ladrões',40,3,3,'Mestre da fuga: proteção lendária.','broquel_rei.webp','lendario']]),
 ...make('arcanista','grimorio',[
  ['grimorio_estrelas','Grimório das Sete Estrelas',24,1,1,'Conjunção: amplifica magia estelar.','grimorio_estrelas.webp','raro'],
  ['grimorio_chama','Grimório da Chama Silenciosa',18,1,1,'Fogo mudo: poder sem revelar o conjurador.','grimorio_chama.webp','incomum'],
  ['grimorio_veu','Grimório do Véu Violeta',27,2,1,'Véu arcano: proteção contra o primeiro ataque.','grimorio_veu.webp','raro'],
  ['grimorio_runas','Grimório das Runas Quebradas',22,2,1,'Fragmentos rúnicos: reforçam feitiços.','grimorio_runas.webp','raro'],
  ['grimorio_tempestade','Grimório da Tempestade Azul',31,2,2,'Descarga escrita: relâmpago arcano.','grimorio_tempestade.webp','epico'],
  ['grimorio_tempo','Grimório do Tempo Perdido',34,3,2,'Página roubada: altera a iniciativa.','grimorio_tempo.webp','epico'],
  ['grimorio_lua','Grimório da Lua Morta',17,1,1,'Eclipse menor: poder em locais sombrios.','grimorio_lua.webp','incomum'],
  ['grimorio_primeiro','Grimório do Primeiro Arcanista',45,4,3,'Conhecimento primordial: domínio arcano supremo.','grimorio_primeiro.webp','lendario']])
]
