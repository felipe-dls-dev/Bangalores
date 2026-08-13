import type { Equipment, GameEvent, SubregionEnemy } from '../types'

export const EXTRA_SUBREGION_ENEMIES:Record<string,SubregionEnemy[]> = {
  campos_estrada:[{nome:'Bandoleiro da Estrada Velha',ataque:3,vida:12,ouro:4,habilidade:'Emboscada entre as carroças',arte:'assets/art/pilot/grumnak-hd-v2.webp'}],
  campos_ponte:[{nome:'Cobrador Corrompido de Eldrimar',ataque:4,vida:15,ouro:5,habilidade:'Pedágio sangrento',arte:'assets/art/pilot/grumnak-hd-v2.webp'}],
  lunar_bosque:[{nome:'Cervo de Chifres Lunares',ataque:5,vida:18,ouro:6,habilidade:'Investida iluminada',arte:'assets/art/hd/monsters/guardia-seiva-hd.webp'}],
  lunar_goblins:[{nome:'Xamã Goblin das Brasas',ataque:6,vida:17,ouro:7,habilidade:'Maldição da fogueira verde',arte:'assets/art/hd/monsters/fanatico-orgulho-hd.webp'}],
  lunar_monolito:[{nome:'Vigia Rúnico Desperto',ataque:7,vida:24,ouro:8,habilidade:'Pulso do monólito',arte:'assets/art/pilot/sentinela-runas-hd-v2.webp'}],
  lunar_aranhas:[{nome:'Tecelã de Veneno Prateado',ataque:8,vida:25,ouro:9,habilidade:'Teia envenenada',arte:'assets/art/hd/monsters/cabra-malgor-hd.webp'}],
  montanhas_passagem:[{nome:'Saqueador dos Picos',ataque:8,vida:30,ouro:9,habilidade:'Machado da avalanche',arte:'assets/art/pilot/grumnak-hd-v2.webp'}],
  montanhas_mina:[{nome:'Mineiro Ossificado',ataque:9,vida:32,ouro:10,habilidade:'Picareta espectral',arte:'assets/art/hd/monsters/espectro-rainha-hd.webp'}],
  montanhas_gelo:[{nome:'Troll da Geada Profunda',ataque:10,vida:38,ouro:12,habilidade:'Sopro congelante',arte:'assets/art/pilot/troll-anciao-hd-v2.webp'}],
  pico_encosta:[{nome:'Salamandra de Magma',ataque:12,vida:42,ouro:14,habilidade:'Sangue incandescente',arte:'assets/art/hd/monsters/cabra-malgor-hd.webp'}],
  pico_ninho_dragao:[{nome:'Draconato da Guarda Rubra',ataque:15,vida:55,ouro:19,habilidade:'Escamas de fogo ancestral',arte:'assets/art/hd/monsters/fanatico-orgulho-hd.webp'}],
  mortas_campos:[{nome:'Ceifador dos Campos Mortos',ataque:11,vida:40,ouro:13,habilidade:'Foice do desespero',arte:'assets/art/hd/monsters/espectro-rainha-hd.webp'}],
  mortas_catacumbas:[{nome:'Cavaleiro sem Sepultura',ataque:14,vida:52,ouro:17,habilidade:'Juramento além da morte',arte:'assets/art/pilot/sentinela-runas-hd-v2.webp'}],
  khar_galerias:[{nome:'Autômato de Bronze Anão',ataque:9,vida:36,ouro:11,habilidade:'Engrenagens blindadas',arte:'assets/art/pilot/sentinela-runas-hd-v2.webp'}],
  khar_labirinto:[{nome:'Minotauro Exilado',ataque:12,vida:46,ouro:15,habilidade:'Fúria do labirinto',arte:'assets/art/pilot/troll-anciao-hd-v2.webp'}],
  khar_templo_minotauro:[{nome:'Oráculo dos Chifres Negros',ataque:14,vida:49,ouro:18,habilidade:'Visão do golpe futuro',arte:'assets/art/hd/monsters/ilusionista-areias-hd.webp'}]
}

const eq=(id:string,nome:string,slot:Equipment['slot'],preco:number,ataque:number,vida:number,defesa:number,habilidade:string,arte:string,raridade:Equipment['raridade']):Equipment=>({id,nome,slot,preco,ataque,vida,defesa,habilidade,arte,imagem:arte,raridade})
export const EXTRA_EQUIPMENT:Equipment[] = [
 eq('espada_aurora','Espada da Primeira Aurora','mao_direita',38,3,0,0,'Luz nascente: o primeiro ataque causa +2 de dano.','assets/art/hd/equipment-extra/espada_aurora-hd.webp','epico'),
 eq('martelo_khardur','Martelo dos Salões de Khar-Dur','mao_direita',34,2,2,0,'Tremor anão: golpes ignoram parte da defesa inimiga.','assets/art/hd/equipment-extra/martelo_khardur-hd.webp','raro'),
 eq('adaga_nevoa','Adaga da Névoa Silenciosa','mao_direita',25,2,0,0,'Passo oculto: vantagem no primeiro turno.','assets/art/hd/equipment-extra/adaga_nevoa-hd.webp','raro'),
 eq('cajado_monolito','Cajado do Monólito Partido','mao_direita',31,2,3,0,'Eco rúnico: fortalece bênçãos recebidas em eventos.','assets/art/hd/equipment-extra/cajado_monolito-hd.webp','epico'),
 eq('escudo_eldrimar','Escudo da Ponte de Eldrimar','mao_esquerda',23,0,2,2,'Posição firme: recebe +1 de escudo no início do combate.','assets/art/hd/equipment-extra/escudo_eldrimar-hd.webp','raro'),
 eq('broquel_lunar','Broquel da Lua Crescente','mao_esquerda',19,0,1,2,'Reflexo lunar: reduz o primeiro dano sofrido.','assets/art/hd/equipment-extra/broquel_lunar-hd.webp','incomum'),
 eq('armadura_draconica','Armadura de Escamas Rubras','peitoral',46,0,8,3,'Resistência ígnea: proteção contra criaturas do Pico Escarlate.','assets/art/hd/equipment-extra/armadura_draconica-hd.webp','lendario'),
 eq('cota_anao','Cota dos Ferreiros Caídos','peitoral',36,0,6,3,'Malha ancestral: aumenta a resistência física.','assets/art/hd/equipment-extra/cota_anao-hd.webp','epico'),
 eq('elmo_vigia','Elmo do Vigia sem Sono','capacete',28,1,2,1,'Vigilância: evita emboscadas comuns.','assets/art/hd/equipment-extra/elmo_vigia-hd.webp','raro'),
 eq('coroa_espinhos','Coroa dos Espinhos Negros','capacete',35,2,2,1,'Retaliação sombria: devolve parte do primeiro golpe.','assets/art/hd/equipment-extra/coroa_espinhos-hd.webp','epico'),
 eq('grevas_avalanche','Grevas da Avalanche','calcas',27,0,3,2,'Passo pesado: concede estabilidade nas montanhas.','assets/art/hd/equipment-extra/grevas_avalanche-hd.webp','raro'),
 eq('calcas_nevoa','Calças do Batedor da Névoa','calcas',21,1,2,1,'Caminho oculto: melhora fugas de combate.','assets/art/hd/equipment-extra/calcas_nevoa-hd.webp','incomum'),
 eq('botas_caminhos','Botas dos Sete Caminhos','botas',30,1,2,1,'Marcha incansável: recupera vigor após exploração.','assets/art/hd/equipment-extra/botas_caminhos-hd.webp','raro'),
 eq('botas_magma','Botas de Cinza Vulcânica','botas',33,1,3,1,'Pés em brasa: afinidade com o Pico Escarlate.','assets/art/hd/equipment-extra/botas_magma-hd.webp','epico'),
 eq('anel_corvo','Anel do Corvo de Ignaroth','anel_1',26,1,1,0,'Presságio: melhora recompensas de encontros arriscados.','assets/art/hd/equipment-extra/anel_corvo-hd.webp','raro'),
 eq('anel_morvath','Selo de Morvath','anel_2',39,2,3,0,'Pacto funerário: poder cresce quando a vida está baixa.','assets/art/hd/equipment-extra/anel_morvath-hd.webp','epico'),
 eq('amuleto_seiva','Amuleto da Seiva Prateada','amuleto',24,0,4,1,'Regeneração lunar: fortalece efeitos de cura.','assets/art/hd/equipment-extra/amuleto_seiva-hd.webp','raro'),
 eq('amuleto_dragao','Presa do Dragão Vermelho','amuleto',48,3,4,1,'Fúria dracônica: poder ancestral no primeiro ataque.','assets/art/hd/equipment-extra/amuleto_dragao-hd.webp','lendario'),
 eq('anel_minotauro','Anel do Labirinto Infinito','anel_1',32,1,3,1,'Memória dos caminhos: resistência contra confusão.','assets/art/hd/equipment-extra/anel_minotauro-hd.webp','epico'),
 eq('manto_rainha','Manto da Rainha sem Trono','peitoral',44,1,7,2,'Majestade perdida: aumenta recompensas de chefes.','assets/art/hd/equipment-extra/manto_rainha-hd.webp','lendario'),
 eq('espada_leao_valoria','Espada do Leão de Valoria','mao_direita',18,1,1,0,'Bravura real: fortalece o primeiro ataque.','assets/art/hd/class-weapons/espada_leao_valoria-hd.webp','incomum'),
 eq('espada_juramento_solar','Espada do Juramento Solar','mao_direita',25,2,0,0,'Juramento radiante: causa dano adicional contra mortos-vivos.','assets/art/hd/class-weapons/espada_juramento_solar-hd.webp','raro'),
 eq('espada_sangue_real','Espada do Sangue Real','mao_direita',42,4,2,0,'Linhagem soberana: poder máximo quando a vida está cheia.','assets/art/hd/class-weapons/espada_sangue_real-hd.webp','lendario'),
 eq('lamina_vento','Lâmina do Vento Cortante','mao_direita',16,1,0,0,'Corte veloz: melhora a iniciativa.','assets/art/hd/class-weapons/lamina_vento-hd.webp','incomum'),
 eq('lamina_cinzas','Lâmina das Cinzas Eternas','mao_direita',31,3,0,0,'Brasa persistente: o primeiro golpe queima o alvo.','assets/art/hd/class-weapons/lamina_cinzas-hd.webp','epico'),
 eq('lamina_cavaleiro','Lâmina do Cavaleiro Sem Nome','mao_direita',24,2,1,0,'Honra esquecida: concede resistência ao lutar sozinho.','assets/art/hd/class-weapons/lamina_cavaleiro-hd.webp','raro'),
 eq('machado_pico','Machado do Pico Partido','mao_direita',32,3,2,0,'Ruptura da montanha: golpes pesados quebram defesas.','assets/art/hd/class-weapons/machado_pico-hd.webp','epico'),
 eq('machado_bronze','Machado da Barba de Bronze','mao_direita',18,1,2,0,'Tradição anã: aumenta a firmeza do portador.','assets/art/hd/class-weapons/machado_bronze-hd.webp','incomum'),
 eq('machado_inverno','Machado do Inverno Imóvel','mao_direita',26,2,2,0,'Gelo imóvel: reduz o ímpeto do inimigo.','assets/art/hd/class-weapons/machado_inverno-hd.webp','raro'),
 eq('martelo_muralha','Martelo da Muralha Viva','mao_direita',23,2,3,0,'Muralha viva: concede proteção ao atacar.','assets/art/hd/class-weapons/martelo_muralha-hd.webp','raro'),
 eq('martelo_trovao','Martelo do Trovão Subterrâneo','mao_direita',43,4,3,0,'Trovão profundo: o primeiro impacto reverbera.','assets/art/hd/class-weapons/martelo_trovao-hd.webp','lendario'),
 eq('martelo_bastiao','Martelo do Último Bastião','mao_direita',17,1,3,0,'Última defesa: fica mais forte com pouca vida.','assets/art/hd/class-weapons/martelo_bastiao-hd.webp','incomum'),
 eq('facas_lua','Facas da Lua Gêmea','mao_direita',26,2,0,0,'Dança lunar: dois cortes no primeiro ataque.','assets/art/hd/class-weapons/facas_lua-hd.webp','raro'),
 eq('facas_predador','Facas do Predador Silencioso','mao_direita',17,1,0,0,'Predador: melhora ataques contra inimigos feridos.','assets/art/hd/class-weapons/facas_predador-hd.webp','incomum'),
 eq('facas_trilha','Facas da Trilha Rubra','mao_direita',23,2,1,0,'Rastro rubro: facilita perseguir inimigos em fuga.','assets/art/hd/class-weapons/facas_trilha-hd.webp','raro'),
 eq('adaga_sussurro','Adaga do Sussurro Verde','mao_direita',18,1,1,0,'Sussurro da mata: afinidade com Lunargenta.','assets/art/hd/class-weapons/adaga_sussurro-hd.webp','incomum'),
 eq('adaga_aranha','Adaga da Aranha Prateada','mao_direita',32,3,0,0,'Veneno prateado: enfraquece o alvo após o golpe.','assets/art/hd/class-weapons/adaga_aranha-hd.webp','epico'),
 eq('adaga_rastro','Adaga do Último Rastro','mao_direita',41,4,1,0,'Caçada perfeita: recompensa ataques precisos.','assets/art/hd/class-weapons/adaga_rastro-hd.webp','lendario'),
 eq('cajado_estrelas','Cajado das Sete Estrelas','mao_direita',27,2,2,0,'Conjunção: fortalece bênçãos arcanas.','assets/art/hd/class-weapons/cajado_estrelas-hd.webp','raro'),
 eq('cajado_biblioteca','Cajado da Biblioteca Ardente','mao_direita',18,1,1,0,'Tomo em chamas: preserva magia de eventos.','assets/art/hd/class-weapons/cajado_biblioteca-hd.webp','incomum'),
 eq('cajado_tempo','Cajado do Tempo Fraturado','mao_direita',44,4,2,0,'Instante roubado: altera o ritmo do primeiro turno.','assets/art/hd/class-weapons/cajado_tempo-hd.webp','lendario'),
 eq('orbe_tempestade','Orbe da Tempestade Cativa','mao_direita',32,3,0,0,'Relâmpago cativo: descarga no primeiro ataque.','assets/art/hd/class-weapons/orbe_tempestade-hd.webp','epico'),
 eq('orbe_veu','Orbe do Véu Esquecido','mao_direita',17,1,1,0,'Véu arcano: reduz o primeiro dano recebido.','assets/art/hd/class-weapons/orbe_veu-hd.webp','incomum'),
 eq('orbe_sol_morto','Orbe do Sol Morto','mao_direita',25,2,1,0,'Eclipse: poder aumenta contra chefes.','assets/art/hd/class-weapons/orbe_sol_morto-hd.webp','raro')
]

const eventNames=[
 ['mercado_fantasmas','O Mercado dos Fantasmas','ouro_risco',7,'Negocie com mercadores mortos e arrisque suas moedas.'],['fonte_estrelas','A Fonte das Estrelas','cura',6,'A água celeste restaura suas forças.'],['caravana_cinzas','A Caravana das Cinzas','item',1,'Viajantes do sul oferecem um suprimento raro.'],['sino_subterraneo','O Sino Sob a Montanha','dano',3,'O toque subterrâneo abala corpo e espírito.'],['mapa_cego','O Cartógrafo Cego','ouro',5,'Uma rota esquecida revela um tesouro escondido.'],
 ['altar_lobos','O Altar dos Lobos','ataque',2,'Um juramento selvagem fortalece o próximo combate.'],['ponte_quebrada','A Ponte Quebrada','ouro_risco',5,'Atravesse as ruínas e alcance uma carga abandonada.'],['chuva_rubi','A Chuva de Rubis','ouro',6,'Fragmentos vermelhos caem sobre o Pico Escarlate.'],['peregrino_sem_rosto','O Peregrino sem Rosto','escudo',3,'O viajante concede uma proteção de origem desconhecida.'],['banquete_fadas','O Banquete das Fadas','cura',5,'Aceite o alimento feérico e recupere suas forças.'],
 ['mina_sussurros','A Mina dos Sussurros','equipamento',1,'Uma arma antiga repousa além das vozes na pedra.'],['estatua_chora','A Estátua que Chora','dano_ouro',5,'Colete suas lágrimas de prata por um preço doloroso.'],['lua_vermelha','A Noite da Lua Vermelha','ataque',3,'A lua escarlate desperta uma fúria temporária.'],['mensageiro_corvos','O Mensageiro dos Corvos','ouro',4,'Uma mensagem entregue muda o destino de um mercador.'],['jardim_pedra','O Jardim de Pedra','escudo',4,'Runas antigas endurecem sua pele.'],
 ['taverna_errante','A Taverna Errante','cura',4,'Uma estalagem impossível surge no meio da estrada.'],['espelho_malgor','O Espelho de Malgor','ouro_risco',8,'Enfrente seu reflexo sombrio por uma grande recompensa.'],['crianca_neve','A Criança na Nevasca','item',1,'Ao salvá-la, você recebe um frasco de sua família.'],['forja_adormecida','A Forja Adormecida','equipamento',1,'Reacenda as brasas e reclame uma peça esquecida.'],['procissao_mortos','A Procissão dos Mortos','dano',4,'Permaneça em silêncio enquanto os mortos atravessam a estrada.'],
 ['arvore_portas','A Árvore das Cem Portas','ouro_risco',6,'Escolha uma passagem entre mundos e aceite o resultado.'],['gigante_pescador','O Gigante Pescador','ouro',5,'Ajude o gigante e receba parte de sua estranha pesca.'],['biblioteca_chamas','A Biblioteca em Chamas','ataque',2,'Salve um tomo de guerra antes que tudo vire cinzas.'],['curandeira_exilada','A Curandeira Exilada','cura',7,'Proteja a curandeira e receba seu melhor remédio.'],['pedra_juramentos','A Pedra dos Juramentos','escudo',3,'Grave seu nome na rocha e receba sua proteção.'],
 ['ladrao_tempo','O Ladrão de Tempo','ouro_risco',7,'Persiga o criminoso antes que a trilha desapareça.'],['ovo_abandonado','O Ovo Abandonado','item',1,'Uma casca quente protege algo valioso.'],['coroa_lago','A Coroa no Fundo do Lago','dano_ouro',8,'Mergulhe nas águas escuras para recuperar a relíquia.'],['ultimo_ferreiro','O Último Ferreiro de Valoria','equipamento',1,'O mestre oferece sua derradeira criação.'],['aurora_negra','A Aurora Negra','ataque',3,'A luz impossível concede poder e anuncia perigo.']
] as const
// Associação temática com ilustrações de eventos válidas. A sequência antiga
// apontava para 131–160 do PDF, intervalo com cartas partidas e categorias diferentes.
const extraEventArt=[17,3,16,18,1,13,4,8,5,13,14,11,8,10,5,7,2,9,14,18,3,9,8,5,20,10,15,19,14,2]
export const EXTRA_EVENTS:GameEvent[]=eventNames.map((e,i)=>({id:e[0],nome:e[1],tipo:e[2],valor:e[3],descricao:e[4],imagem:`assets/art/events/event-${String(extraEventArt[i]).padStart(2,'0')}.jpg`,arte:`assets/art/events/event-${String(extraEventArt[i]).padStart(2,'0')}.jpg`}))
