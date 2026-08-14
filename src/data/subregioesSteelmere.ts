import type { Rarity, Subregion, SubregionEnemy } from '../types'

type Row=[id:string,regionId:string,nome:string,nivelMin:number,nivelMax:number,icone:string,tema:string,chefe:string,tier:number]
const enemyArt=['assets/art/monsters/sentinela_runas.webp','assets/art/monsters/espectro_rainha.webp','assets/art/monsters/fanatico_orgulho.webp','assets/art/monsters/grumnak.webp','assets/art/monsters/ilusionista_areias.webp','assets/art/monsters/corvo_ignaroth.webp','assets/art/monsters/cabra_malgor.webp']
const bossArt=['assets/art/bosses/boss_troll.webp','assets/art/bosses/boss_minotauro.webp','assets/art/bosses/boss_malgor.webp','assets/art/bosses/boss_necromante.webp','assets/art/bosses/boss_bandoleiro.webp','assets/art/bosses/boss_seiva.webp']

const rows:Row[]=[
 ['frost_rota','frostgard','Rota das Perfuratrizes',20,21,'⚙️','Metais frios e núcleos de vapor','Capataz das Perfuratrizes',1],
 ['frost_refinaria','frostgard','Refinaria Congelada',21,22,'🧊','Peças de latão e óleo congelado','Supervisor Autômato',1],
 ['frost_fenda','frostgard','Fenda de Criovapor',22,23,'💨','Cristais de gelo e vapor condensado','Elemental de Criovapor',1],
 ['frost_estaleiro','frostgard','Estaleiro Aéreo',23,24,'🎈','Peças de dirigível e mapas de rota','Capitã dos Corsários do Céu',1],
 ['frost_geleira','frostgard','Coração da Geleira',24,25,'❄️','Núcleos arcanos e ligas raras','Leviatã de Gelo e Engrenagens',1],

 ['engren_trilha','engrenverde','Trilha das Engrenagens',22,23,'⚙️','Molas e engrenagens','Enxame de Autômatos Rastejantes',2],
 ['engren_vila','engrenverde','Vila Suspensa',23,24,'🌲','Sedas de cobre e lanternas','Guarda da Vila Suspensa',2],
 ['engren_estufa','engrenverde','Estufa de Vapor',24,25,'🌿','Sementes mecânicas e seiva espessa','Flora Bio-Mecânica Desperta',2],
 ['engren_torre','engrenverde','Torre de Ancoragem',25,26,'🎐','Cabos e âncoras de dirigível','Comandante dos Saqueadores do Céu',2],
 ['engren_cerne','engrenverde','Cerne Vivo',26,27,'🌳','Madeira viva e núcleos vegetais','Guardião de Casca e Engrenagem',2],

 ['trilho_trilhos','trilhouro','Trilhos do Grão',25,26,'🚂','Grãos e ferramentas','Bando dos Trilhos',3],
 ['trilho_fazenda','trilhouro','Fazenda Automatizada',26,27,'🌾','Peças agrícolas e óleo','Trator Rebelde',3],
 ['trilho_silo','trilhouro','Silo de Latão',27,28,'🛢️','Latão e grãos fermentados','Guardião do Silo',3],
 ['trilho_comboio','trilhouro','Comboio Fantasma',28,29,'👻','Carga perdida e bilhetes antigos','Maquinista Esquecido',3],
 ['trilho_terminal','trilhouro','Estação Terminal',29,30,'🏛️','Tesouros ferroviários e relíquias','Barão dos Trilhos',3],

 ['vulcan_encosta','vulcannis','Encosta das Fornalhas',28,29,'🔥','Minério incandescente','Autômato Forjado em Brasa',4],
 ['vulcan_aqueduto','vulcannis','Aqueduto de Magma',29,30,'🌋','Ligas fundidas','Serpente de Magma Canalizado',4],
 ['vulcan_fundicao','vulcannis','Fundição Colossal',31,32,'⚒️','Aço temperado e núcleos de forja','Mestre Fundidor Mecânico',4],
 ['vulcan_chamines','vulcannis','Chaminés Gêmeas',32,33,'🏭','Fuligem rara e válvulas','Sentinela das Chaminés',4],
 ['vulcan_camara','vulcannis','Câmara do Vulcão',33,34,'🌋','Núcleos vulcânicos e tesouros forjados','Golem-Reator do Magma',4],

 ['ferro_trilha','ferrujal','Trilha da Ferrugem',30,31,'🔩','Sucata e peças oxidadas','Sucateiro Blindado',5],
 ['ferro_pocas','ferrujal','Poças Tóxicas',31,32,'☣️','Ácidos e reagentes raros','Horror Corrosivo',5],
 ['ferro_fabrica','ferrujal','Fábrica Abandonada',32,33,'🏚️','Componentes industriais esquecidos','Linha de Montagem Amaldiçoada',5],
 ['ferro_cemiterio','ferrujal','Cemitério de Autômatos',34,35,'💀','Núcleos residuais e memórias gravadas','Legião de Autômatos Desligados',5],
 ['ferro_nucleo','ferrujal','Núcleo Corrompido',35,36,'☢️','Fragmentos corrompidos e ligas instáveis','Autômato-Mestre Corrompido',5],

 ['coro_viaduto','coroferro','Viaduto Elevado',33,34,'🚇','Bilhetes e ferramentas urbanas','Capitão da Guarda Ferroviária',6],
 ['coro_distrito','coroferro','Distrito das Chaminés',35,36,'🏙️','Componentes urbanos refinados','Chefe do Distrito Industrial',6],
 ['coro_praca','coroferro','Praça dos Relógios',36,37,'🕰️','Engrenagens de precisão','Autômato Relojoeiro',6],
 ['coro_subterraneo','coroferro','Subterrâneo a Vapor',37,38,'🚿','Válvulas raras e mapas dos túneis','Guardião dos Dutos',6],
 ['coro_torre','coroferro','Torre do Grande Relógio',39,40,'👑','Tesouros da coroa e relíquias reais','Tirano Mecânico de Coroferro',6],

 ['aether_anel','aetherium','Anel Externo',38,40,'⭕','Fragmentos de aether','Sentinela do Anel Externo',7],
 ['aether_galeria','aetherium','Galeria dos Pistões',41,42,'🔧','Pistões encantados','Guardião dos Pistões',7],
 ['aether_ressonancia','aetherium','Câmara de Ressonância',43,45,'🔮','Cristais ressonantes','Eco Arcano-Mecânico',7],
 ['aether_vortice','aetherium','Vórtice de Aether',46,48,'🌀','Energia pura de aether','Fragmento do Vórtice',7],
 ['aether_coracao','aetherium','Coração do Reator',48,50,'⚡','Tesouros míticos e núcleos supremos','O Arquiteto de Steelmere',7],
]

function makeEnemy(name:string,level:number,index:number):SubregionEnemy{return{nome:name,ataque:Math.ceil(4+level*.9)+(index===2?2:0),vida:Math.ceil(14+level*3.6)+(index===1?8:0),ouro:Math.ceil(6+level*1.3),habilidade:['Ataque a vapor','Blindagem reforçada','Precisão mecânica'][index],arte:enemyArt[(level+index)%enemyArt.length]}}
export const STEELMERE_SUBREGIONS:Subregion[]=rows.map((row,index)=>{const[id,regionId,nome,min,max,icone,tema,chefe,tier]=row,encontrosNecessarios=3+Math.min(3,Math.floor(tier/2)),raridade=(tier>=7?'mitico':tier>=5?'lendario':tier>=3?'epico':'raro') as Rarity,maxFases=tier>=7?4:tier>=4?3:2
 return{id,regionId,nome,descricao:`Uma expedição perigosa em ${nome}, no coração industrial de Steelmere.`,nivelMin:min,nivelMax:max,encontrosNecessarios,icone,temaLoot:tema,desafios:['Vazamento de vapor','Patrulha automatizada','Cofre trancado','Armadilha mecânica'],inimigos:[makeEnemy(`Predador de ${nome}`,min,0),makeEnemy(`Sentinela de ${nome}`,min+1,1),makeEnemy(`Arauto de ${nome}`,max,2)],chefe:{nome:chefe,ataque:Math.ceil(8+max*1.1),vida:Math.ceil(30+max*7.2),ouro:Math.ceil(14+max*6.4),habilidade:maxFases>=4?'Quatro fases e sobrecarga crescente':maxFases>=3?'Muda de fase e reforça a blindagem':'Ataque duplo ao perder metade da vida',arte:bossArt[index%bossArt.length],maxFases,raridade:raridade as Rarity}}
})
