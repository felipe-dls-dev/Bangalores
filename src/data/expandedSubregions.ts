import type { Rarity, Subregion, SubregionEnemy } from '../types'

type Row=[id:string,regionId:string,nome:string,nivelMin:number,nivelMax:number,icone:string,tema:string,chefe:string]
const enemyArt=['assets/art/monsters/grumnak.webp','assets/art/monsters/fanatico_orgulho.webp','assets/art/monsters/sentinela_runas.webp','assets/art/monsters/espectro_rainha.webp','assets/art/monsters/cabra_malgor.webp','assets/art/monsters/ilusionista_areias.webp','assets/art/monsters/corvo_ignaroth.webp']
const bossArt=['assets/art/bosses/boss_bandoleiro.webp','assets/art/bosses/boss_seiva.webp','assets/art/bosses/boss_troll.webp','assets/art/bosses/boss_minotauro.webp','assets/art/bosses/boss_necromante.webp','assets/art/bosses/boss_malgor.webp']
const rows:Row[]=[
 ['campos_fazendas','campos_dourados','Fazendas de Valedouro',1,3,'🌾','Couro, alimentos e ferramentas','Barão Espantalho'],
 ['campos_moinho','campos_dourados','Moinho dos Corvos',2,4,'🌬️','Poções, ouro e armas simples','Corvo-Mestre do Moinho'],
 ['campos_ruinas','campos_dourados','Ruínas de Aurídia',3,5,'🏛️','Relíquias e equipamentos incomuns','Cavaleiro Dourado Caído'],
 ['lunar_lago','floresta_lunargenta','Lago do Espelho Lunar',4,6,'🌙','Amuletos, essências e prata','Náiade do Espelho Negro'],
 ['lunar_raizes','floresta_lunargenta','Raízes da Árvore Anciã',6,8,'🌳','Ervas, cajados e grimórios','Coração Corrompido da Floresta'],
 ['lunar_pantano','floresta_lunargenta','Pântano dos Sussurros',7,9,'🐸','Venenos, adagas e antídotos','Rei Sapo das Brumas'],
 ['montanhas_forte','montanhas_cinzentas','Forte da Nevasca',7,9,'🏰','Armaduras pesadas e escudos','Comandante da Nevasca'],
 ['montanhas_abismo','montanhas_cinzentas','Abismo dos Ecos',9,11,'🕳️','Cristais, runas e metais raros','Verme do Abismo Cinzento'],
 ['montanhas_cume','montanhas_cinzentas','Cume do Trovão',10,13,'⚡','Martelos, machados e relíquias','Titã da Tempestade'],
 ['pico_cinzas','pico_escarlate','Deserto de Cinzas',10,13,'🔥','Óleos, armas ígneas e ouro','Colosso das Cinzas'],
 ['pico_forja','pico_escarlate','Forja dos Draconatos',13,16,'⚒️','Armas épicas e escamas','Mestre Draconato da Forja'],
 ['pico_cratera','pico_escarlate','Cratera do Sol Morto',15,19,'☀️','Tesouros lendários e artefatos','Fênix do Sol Morto'],
 ['mortas_vila','terras_mortas','Vila dos Sem-Rosto',11,14,'🏚️','Moedas antigas e amuletos','Prefeito sem Face'],
 ['mortas_brejo','terras_mortas','Brejo das Almas',13,16,'🕯️','Essências, foices e grimórios','Hidra Espectral'],
 ['mortas_torre','terras_mortas','Torre da Necromancia',15,18,'🗼','Relíquias míticas e magia sombria','Arquimorto de Morvath'],
 ['khar_forjas','khar_dur','Forjas Silenciosas',7,10,'🔥','Metais anões e martelos','Forjador de Ferro Negro'],
 ['khar_cofre','khar_dur','Cofre dos Reis Anões',9,12,'🔐','Ouro, joias e armaduras','Rei de Bronze Desperto'],
 ['khar_profundezas','khar_dur','Profundezas de Kholgard',11,14,'⛏️','Runas ancestrais e equipamentos épicos','Devorador das Profundezas'],
 ['eclipse_jardim','coracao_eclipse','Jardim das Estrelas Mortas',18,21,'✦','Fragmentos astrais e orbes','Astrônomo Devorado'],
 ['eclipse_arquivo','coracao_eclipse','Arquivo das Eras Perdidas',21,24,'📜','Grimórios míticos e relíquias','Cronista do Fim'],
 ['eclipse_fenda','coracao_eclipse','Fenda Primordial',24,28,'🜏','Artefatos finais e tesouros do vazio','Abominação Primordial']
]

function makeEnemy(name:string,level:number,index:number):SubregionEnemy{return{nome:name,ataque:Math.ceil(2+level*.88)+(index===2?1:0),vida:Math.ceil(7+level*3.25)+(index===1?6:0),ouro:Math.ceil(2+level*1.18),habilidade:['Ataque coordenado','Defesa implacável','Poder ancestral'][index],arte:enemyArt[(level+index)%enemyArt.length]}}
export const EXPANDED_SUBREGIONS:Subregion[]=rows.map((row,index)=>{const[id,regionId,nome,min,max,icone,tema,chefe]=row,late=min>=15;return{id,regionId,nome,descricao:`Uma rota perigosa de ${nome}, repleta de ameaças e recompensas adequadas a aventureiros experientes.`,nivelMin:min,nivelMax:max,encontrosNecessarios:late?7:min>=9?6:4,icone,temaLoot:tema,desafios:['Rota oculta','Encontro de elite','Tesouro protegido','Armadilha ancestral'],inimigos:[makeEnemy(`Predador de ${nome}`,min,0),makeEnemy(`Sentinela de ${nome}`,min+1,1),makeEnemy(`Arauto de ${nome}`,max,2)],chefe:{nome:chefe,ataque:Math.ceil(6+max*1.05),vida:Math.ceil(24+max*7.6),ouro:Math.ceil(12+max*7),habilidade:late?'Quatro fases e poder crescente':'Muda de fase e fortalece seus ataques',arte:bossArt[index%bossArt.length],maxFases:late?4:3,raridade:(late?'mitico':max>=11?'lendario':'epico') as Rarity}}})
