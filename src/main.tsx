import React from 'react'
import ReactDOM from 'react-dom/client'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Map, ScrollText, Backpack, Shield, ShoppingBag, Images, Menu, Sword, Sparkles, Coins, Trophy, Package, Plus, ArrowLeft, ArrowRight, FlaskConical, Footprints, Dices } from 'lucide-react'
import { useGame, HEROES, EQUIPMENT, CONSUMABLES, MONSTERS, TERRITORIES, SUBREGIONS, BOSSES, EVENTS, SLOT_ORDER, maxHp, attackValue, defenseValue, levelInfo, equipmentAffinity, equipmentAttackForHero, equipmentCompatibility, equipmentClassAllowed, equipmentRequiredLevel, equipmentLevelAllowed } from './store/game'
import type { Slot, Rarity, Subregion } from './types'
import './styles.css'

const nav=[['map','Mapa',Map],['character','Ficha',ScrollText],['inventory','Mochila',Backpack],['equipment','Equipamentos',Shield],['shop','Loja',ShoppingBag],['gallery','Galeria',Images]] as const
const slotNames:Record<Slot,string>={amuleto:'Amuleto',capacete:'Capacete',anel_1:'Anel 1',peitoral:'Peitoral',anel_2:'Anel 2',calcas:'Calças',mao_esquerda:'Mão esquerda',mao_direita:'Mão direita',botas:'Botas'}
const classNames:Record<string,string>={guerreiro:'Guerreiro',guardiao:'Guardião',cacadora:'Ladino',arcanista:'Arcanista'}
function compatibilityLabel(e:any,heroId?:string){if(e.classeExclusiva)return equipmentClassAllowed(e,heroId)?`Exclusivo: ${classNames[e.classeExclusiva]} • compatível`:`Exclusivo para ${classNames[e.classeExclusiva]}`;const c=equipmentCompatibility(e,heroId);if(!c.affinity)return'Arma neutra • sem penalidade de classe';return c.compatible?`Afinidade: ${classNames[c.affinity]} • bônus completo`:`Afinidade: ${classNames[c.affinity]} • penalidade: -${c.penalty} ATQ`}
const eliteGallery=MONSTERS.map(x=>({...x,id:`elite_${x.id}`,nome:`Elite: ${x.nome}`,ataque:Math.ceil(x.ataque*1.24),vida:Math.ceil(x.vida*1.55),ouro:Math.ceil(x.ouro*1.7),habilidade:`${x.habilidade} • Técnica de elite`,elite:true,raridade:'raro' as Rarity,kind:'Elite'}))
const allGallery=[...HEROES.map(x=>({...x,kind:'Herói'})),...EQUIPMENT.map(x=>({...x,kind:'Equipamento'})),...CONSUMABLES.map(x=>({...x,kind:'Consumível'})),...MONSTERS.map(x=>({...x,kind:'Monstro'})),...eliteGallery,...Object.values(BOSSES).map(x=>({...x,kind:'Chefe'})),...EVENTS.map(x=>({...x,kind:'Evento'}))]
const galleryCategories=[['Todos','Todas'],['Herói','Heróis'],['Equipamento','Equipamentos'],['Consumível','Consumíveis'],['Monstro','Monstros'],['Elite','Monstros de elite'],['Chefe','Chefes'],['Evento','Eventos']] as const
const shopTabs=['Armas','Equipamentos','Consumíveis'] as const
type ShopTab=typeof shopTabs[number]
const weaponFilters=[['Todos','Todas'],['guerreiro','Guerreiro'],['guardiao','Guardião'],['cacadora','Ladino'],['arcanista','Arcanista'],['neutra','Neutras']] as const
const equipmentFilters=[['Todos','Todos'],['mao_esquerda','Mão esquerda'],['peitoral','Armaduras'],['capacete','Capacetes'],['calcas','Calças'],['botas','Botas'],['aneis','Anéis'],['amuleto','Amuletos']] as const
const consumableFilters=[['Todos','Todos'],['cura','Cura'],['bonus','Bônus']] as const
const SUBREGION_MAP_POINTS:Record<string,[number,number]>={
 campos_estrada:[.20,.35],campos_ponte:[.28,.58],lunar_bosque:[.75,.51],lunar_goblins:[.66,.52],lunar_monolito:[.70,.37],lunar_aranhas:[.87,.59],
 montanhas_passagem:[.35,.14],montanhas_mina:[.38,.27],montanhas_gelo:[.43,.22],pico_encosta:[.60,.19],pico_ninho_dragao:[.68,.14],
 mortas_campos:[.58,.78],mortas_catacumbas:[.57,.69],khar_galerias:[.35,.71],khar_labirinto:[.40,.72],khar_templo_minotauro:[.34,.84]
}

const rarityLabel:Record<Rarity,string>={comum:'Comum',incomum:'Incomum',raro:'Raro',epico:'Épico',lendario:'Lendário',mitico:'Mítico',heroico:'Heróico'}
function cardArt(card:any){return card.arte??card.imagem}
function artText(card:any){return card.habilidade??card.descricao??'Uma figura importante nas terras de Eldravar.'}
function artStats(card:any,kind?:string){
 if(kind==='Evento')return 'Encontro de exploração'
 if(kind==='Equipamento')return `Nível ${equipmentRequiredLevel(card)} • Ataque +${card.ataque??0} • Defesa +${card.defesa??0} • Vida +${card.vida??0}`
 if(kind==='Consumível')return `${card.tipo??'Efeito'} • Valor ${card.valor??0}`
 if(kind==='Herói')return `Ataque ${card.ataque??0} • Vida ${card.vida??0}`
 return `Ataque ${card.ataque??0} • Vida ${card.vida??0}${card.ouro!==undefined?` • Recompensa ${card.ouro} ouro`:''}`
}
function ArtPreview({image,name,text,stats,className}:{image:string;name:string;text?:string;stats?:string;className?:string}){
 const [open,setOpen]=React.useState(false)
 const equipment=className?.includes('slot-art-preview')?EQUIPMENT.find(item=>item.nome===name):undefined
 const emblem=equipment?cardEmblem(equipment,'Equipamento'):undefined
 const owner=equipment?.classeExclusiva??(equipment?equipmentAffinity(equipment):undefined)
 return <span className={`art-preview-trigger ${className??''}`} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} tabIndex={0} aria-label={`Ampliar arte de ${name}`}>
  <img src={'./'+image} alt={name}/>
  {emblem&&<img className="slot-class-emblem" src={'./'+emblem} alt={owner?classNames[owner]:'Universal'} aria-hidden="true"/>}
  {open&&createPortal(<span className="art-preview-overlay" aria-hidden="true"><span className="art-preview-card"><img src={'./'+image} alt=""/><span className="art-preview-copy"><small>ARTE COMPLETA</small><strong>{name}</strong>{text&&<span>{text}</span>}{stats&&<b>{stats}</b>}<em>Mantenha o mouse sobre a imagem</em></span></span></span>,document.body)}
 </span>
}
function cardRarity(card:any,kind?:string):Rarity{
 if(card.raridade)return card.raridade as Rarity
 if(kind==='Chefe'||card.boss)return 'lendario'
 if(kind==='Herói')return 'heroico'
 if(typeof card.preco==='number'){if(card.preco>=40)return'lendario';if(card.preco>=30)return'epico';if(card.preco>=22)return'raro';if(card.preco>=14)return'incomum'}
 if(typeof card.dificuldade==='number'){if(card.dificuldade>=5)return'epico';if(card.dificuldade>=3)return'raro';if(card.dificuldade>=2)return'incomum'}
 return 'comum'
}
const cardSystemRoot='assets/ui/card-system/'
function cardEmblem(card:any,kind:string){
 if(kind==='Chefe'||card.boss)return cardSystemRoot+'enemy-boss-v2.webp'
 if(kind==='Elite'||card.elite)return cardSystemRoot+'enemy-elite-v2.webp'
 if(kind==='Monstro')return cardSystemRoot+'enemy-common-v2.webp'
 const classId=kind==='Herói'?card.id:(card.classeExclusiva??(kind==='Equipamento'?equipmentAffinity(card):undefined))
 const icon=({guerreiro:'class-warrior.webp',guardiao:'class-guardian.webp',cacadora:'class-rogue.webp',arcanista:'class-arcanist.webp'} as Record<string,string>)[classId]
 return cardSystemRoot+(icon??'class-universal.webp')
}
function cardBadge(card:any,kind:string,rarity:Rarity){
 if(kind==='Chefe'||card.boss)return'Chefe'
 if(kind==='Elite'||card.elite)return'Elite'
 if(kind==='Monstro')return'Comum'
 return rarityLabel[rarity]
}
function CardFrame({card,kind}:{card:any;kind:string}){
 const rarity=cardRarity(card,kind),baseEffect=card.habilidade??card.descricao??'Sem efeito especial.',effect=kind==='Equipamento'?`Nível ${equipmentRequiredLevel(card)} • ${baseEffect}`:baseEffect
 const enemy=kind==='Monstro'||kind==='Elite'||kind==='Chefe'||card.boss||card.elite
 const attack=card.ataque??0,defense=card.defesa??(enemy?Math.max(0,(card.dificuldade??1)-2):0),life=card.vida??(kind==='Consumível'?card.valor??0:0)
 return <article className={`game-card ornate-card rarity-${rarity} ${enemy?'ornate-enemy':''}`}>
  <div className="ornate-art"><ArtPreview image={cardArt(card)} name={card.nome} text={artText(card)} stats={artStats(card,kind)}/></div>
  <img className="ornate-frame" src={'./'+cardSystemRoot+'frame-overlay.png'} alt="" aria-hidden="true"/>
  <h2 className="ornate-name">{card.nome}</h2>
  <img className="ornate-emblem" src={'./'+cardEmblem(card,kind)} alt={enemy?`Categoria ${cardBadge(card,kind,rarity)}`:`Compatibilidade de ${kind}`}/>
  <strong className="ornate-badge">{cardBadge(card,kind,rarity)}</strong>
  <span className="ornate-stat ornate-attack">{enemy?attack:`+${attack}`}</span>
  <span className="ornate-stat ornate-defense">{enemy?defense:`+${defense}`}</span>
  <span className="ornate-stat ornate-life">{enemy?life:`+${life}`}</span>
  <p className="ornate-effect">{effect}</p>
 </article>
}

function App(){
 const g=useGame();
 const hero=HEROES.find(h=>h.id===g.heroId)
 return <div className="app-shell">
   {g.screen!=='menu'&&g.screen!=='select'&&g.screen!=='event'&&<TopBar/>}
   <AnimatePresence mode="wait">
    <motion.main key={g.screen} className="screen" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.22}}>
      {g.screen==='menu'&&<MainMenu/>}{g.screen==='select'&&<HeroSelect/>}{g.screen==='map'&&<MapScreen/>}{g.screen==='region'&&<RegionScreen/>}{g.screen==='event'&&<EventScreen/>}{g.screen==='character'&&<CharacterScreen/>}{g.screen==='inventory'&&<InventoryScreen/>}{g.screen==='equipment'&&<EquipmentScreen/>}{g.screen==='shop'&&<ShopScreen/>}{g.screen==='gallery'&&<GalleryScreen/>}{g.screen==='combat'&&<CombatScreen/>}{g.screen==='bossIntro'&&<BossIntro/>}{g.screen==='loot'&&<LootScreen/>}
    </motion.main>
   </AnimatePresence>
   {hero&&g.screen!=='menu'&&g.screen!=='select'&&<footer className="footer-tip">Bangalore's • Auto-save ativo • A aventura continua no próximo acesso.</footer>}
 </div>
}

function TopBar(){const g=useGame();const h=HEROES.find(x=>x.id===g.heroId);const level=levelInfo(g.xp).lvl;return <header className="topbar"><nav>{nav.map(([id,label,Icon])=><button key={id} className={(g.screen===id||(id==='map'&&g.screen==='region'))?'active':''} onClick={()=>g.setScreen(id)}><Icon size={18}/><span>{label}</span></button>)}</nav><div className="hud"><Heart className="heart" fill="currentColor"/><strong>{g.hp}/{maxHp(g)}</strong><span className="hud-level" title={`${g.xp} de experiência total`}><Sparkles size={16}/><small>NÍVEL</small><strong>{level}</strong></span><div className="brand">Bangalore's</div><button className="menu-mini" onClick={()=>g.setScreen('menu')}><Menu size={18}/>Menu</button></div></header>}
function MainMenu(){const g=useGame();return <div className="hero-bg menu-hero"><div className="menu-atmosphere"/><section className="menu-card"><p className="menu-eyebrow">AS CRÔNICAS DE ELDRAVAR</p><div className="brand big">Bangalore's</div><div className="menu-divider"><span/></div><p className="tagline">Um RPG de cartas, escolhas e conquistas</p><p className="menu-intro">Escolha seu herói, fortaleça seu arsenal e enfrente as criaturas que marcham sobre Eldravar.</p><div className="menu-actions">{g.heroId&&<button className="primary" onClick={g.continueGame}>Continuar aventura</button>}<button onClick={()=>g.setScreen('select')}>Nova campanha</button>{g.heroId&&<button className="danger-link" onClick={g.clearSave}>Apagar progresso local</button>}</div><p className="save-note"><span>◆</span> O progresso é salvo automaticamente neste navegador.</p></section><aside className="menu-scene-caption"><small>A GUERRA POR ELDRAVAR</small><strong>O reino precisa de um novo campeão.</strong></aside></div>}
function HeroSelect(){const g=useGame();return <div className="select-page"><div className="section-title"><h1>Escolha seu herói</h1><p>Cada classe começa com um conjunto coerente de equipamentos e consumíveis.</p></div><div className="hero-grid">{HEROES.map(h=><motion.button whileHover={{y:-6}} className="hero-card" key={h.id} onClick={()=>g.newGame(h.id)}><ArtPreview image={cardArt(h)} name={h.nome} text={h.habilidade} stats={artStats(h,'Herói')}/><div><h2>{h.nome}</h2><p>{h.habilidade}</p><div className="mini-stats"><span><Heart size={15}/> {h.vida}</span><span><Sword size={15}/> {h.ataque}</span></div></div></motion.button>)}</div></div>}
function Panel({title,children,className=''}:{title?:string;children:React.ReactNode;className?:string}){return <section className={'panel '+className}>{title&&<h2 className="panel-title">{title}</h2>}{children}</section>}
function MapScreen(){const g=useGame();const li=levelInfo(g.xp);return <div className="map-layout"><Panel className="map-panel"><div className="map-wrap"><img src="./assets/maps/eldravar.png" alt="Mapa de Eldravar"/>{TERRITORIES.map(t=>{const subs=SUBREGIONS.filter(s=>s.regionId===t.id);const completed=subs.length>0&&subs.every(s=>g.subregionBossesDefeated.includes(s.id));return <button key={t.id} className={`map-sub-pin map-territory-pin${completed?' completed':''}`} style={{left:`${t.x*100}%`,top:`${t.y*100}%`}} onClick={()=>g.openRegion(t)} title={`Explorar ${t.nome}`} aria-label={`Explorar território ${t.nome}`}><span>{completed?'✓':'◆'}</span><b>{t.nome}</b></button>})}{SUBREGIONS.map(sub=>{const point=SUBREGION_MAP_POINTS[sub.id];if(!point)return null;const completed=g.subregionBossesDefeated.includes(sub.id);return <button key={`sub_${sub.id}`} className={`map-sub-pin${completed?' completed':''}`} style={{left:`${point[0]*100}%`,top:`${point[1]*100}%`}} onClick={()=>g.openSubregion(sub.id)} title={`Acessar diretamente: ${sub.nome}`} aria-label={`Acessar ${sub.nome}`}><span>{completed?'✓':'◆'}</span><b>{sub.nome}</b></button>})}</div></Panel><Panel title="Resumo do herói" className="summary"><Stat label="Vida" value={`${g.hp}/${maxHp(g)}`}/><Stat label="Ataque" value={attackValue(g)}/><Stat label="Defesa" value={defenseValue(g)}/><Stat label="Ouro" value={g.gold}/><Stat label="Equip. guardados" value={`${g.equipmentBag.length}/8`}/><hr/><div className="level-row"><strong>Nível {li.lvl}</strong><span>{li.progress}/{li.next} XP</span></div><div className="xp-track"><div style={{width:`${Math.min(100,li.progress/li.next*100)}%`}}/></div><p className="muted">Experiência total: {g.xp}</p><p className={g.attributePoints?'points hot':'points'}>Pontos de atributo: {g.attributePoints}</p><hr/><strong>Exploração de Eldravar</strong><p className="muted">Todos os losangos dão acesso a territórios ou locais específicos.</p><p className="hint">Passe o mouse para identificar o destino. Um marcador verde indica que seus chefes já foram derrotados.</p></Panel></div>}

function dangerFor(level:number,min:number,max:number){if(level<min-2)return {label:'PERIGO EXTREMO',stars:5,cls:'deadly'};if(level<min)return {label:'Difícil',stars:4,cls:'hard'};if(level<=max)return {label:'Adequado',stars:3,cls:'fair'};if(level<=max+3)return {label:'Fácil',stars:2,cls:'easy'};return {label:'Muito fácil',stars:1,cls:'easy'}}
function RegionScreen(){const g=useGame();const region=TERRITORIES.find(t=>t.id===g.regionId)??TERRITORIES[0];const lvl=levelInfo(g.xp).lvl;const subs=SUBREGIONS.filter(s=>s.regionId===region.id);return <div className="region-page"><Panel className="region-head"><button className="region-back" onClick={()=>g.setScreen('map')}><ArrowLeft/>Mapa</button><div><span className="eyebrow">REGIÃO</span><h1>{region.nome}</h1><p>{region.descricao}</p></div><div className="region-level"><small>Nível recomendado</small><strong>{region.nivelMin}–{region.nivelMax}</strong><span>Seu nível: {lvl}</span></div></Panel>{g.explorationNote&&<div className="exploration-note"><Sparkles/>{g.explorationNote}</div>}<div className="subregion-grid">{subs.map(sub=><SubregionCard key={sub.id} sub={sub} level={lvl}/>)}</div></div>}
function EventScreen(){const g=useGame();const event=g.currentEvent??EVENTS[0];const result=g.eventResult;return <div className="event-page"><div className="event-backdrop"/><Panel className="event-card-panel"><span className="eyebrow">ENCONTRO DE EXPLORAÇÃO</span><div className="event-layout"><div className="event-art"><img src={'./'+(event.arte??event.imagem)} alt={event.nome}/><span>MISSÃO</span></div><div className="event-copy"><ScrollText className="event-icon"/><h1>{event.nome}</h1><p className="event-description">{event.descricao}</p>{!result?<><div className="event-warning"><Dices/><div><strong>O destino pode exigir uma rolagem</strong><small>Resultados de 4 a 6 representam sucesso nas missões de risco.</small></div></div><div className="event-actions"><button className="primary" onClick={()=>g.resolveEvent(true)}>ACEITAR MISSÃO</button><button onClick={()=>g.resolveEvent(false)}>SEGUIR VIAGEM</button></div></>:<div className={`event-result ${result.tone}`}>{result.roll&&<div className="event-die"><Dices/><span>{result.roll}</span></div>}<div><small>RESULTADO</small><strong>{result.message}</strong></div><button className="primary" onClick={g.finishEvent}>CONTINUAR EXPLORAÇÃO</button></div>}</div></div></Panel></div>}
function SubregionCard({sub,level}:{sub:Subregion;level:number}){const g=useGame();const wins=g.subregionVictories[sub.id]??0;const bossDown=g.subregionBossesDefeated.includes(sub.id);const danger=dangerFor(level,sub.nivelMin,sub.nivelMax);const ready=wins>=sub.encontrosNecessarios&&!bossDown;return <motion.article whileHover={{y:-4}} className={`subregion-card danger-${danger.cls}`}><div className="subregion-top"><span className="subregion-icon">{sub.icone}</span><div><h2>{sub.nome}</h2><p>Nível {sub.nivelMin}–{sub.nivelMax}</p></div><span className={`danger-badge ${danger.cls}`}>{danger.label}</span></div><p className="subregion-desc">{sub.descricao}</p><div className="subregion-progress"><div><span>Exploração</span><strong>{Math.min(wins,sub.encontrosNecessarios)}/{sub.encontrosNecessarios}</strong></div><div className="xp-track"><div style={{width:`${Math.min(100,wins/sub.encontrosNecessarios*100)}%`}}/></div></div><div className="subregion-meta"><span>★{'★'.repeat(Math.max(0,danger.stars-1))}{'☆'.repeat(Math.max(0,5-danger.stars))}</span><span>{bossDown?'✓ Chefe derrotado':ready?'CHEFE DISPONÍVEL':'Chefe oculto'}</span></div><div className="subregion-details"><small><b>Loot:</b> {sub.temaLoot}</small><small><b>Desafios:</b> {sub.desafios.slice(0,3).join(' • ')}</small></div><button className={ready?'primary boss-button':'primary'} onClick={()=>g.startEncounter(sub.id)}>{bossDown?'Explorar novamente':ready?'ENFRENTAR CHEFE':'EXPLORAR'}</button></motion.article>}

function Stat({label,value}:{label:string;value:React.ReactNode}){return <div className="stat"><span>{label}</span><strong>{value}</strong></div>}
function CharacterScreen(){const g=useGame();const h=HEROES.find(x=>x.id===g.heroId)!;const li=levelInfo(g.xp);return <div className="char-grid"><Panel className="portrait-panel"><ArtPreview className="portrait" image={cardArt(h)} name={h.nome} text={h.habilidade} stats={`Ataque ${attackValue(g)} • Defesa ${defenseValue(g)} • Vida ${maxHp(g)}`}/><h1>{h.nome}</h1><p>{h.habilidade}</p><div className="points-box">Pontos disponíveis <strong>{g.attributePoints}</strong></div></Panel><Panel title="Atributos"><AttrRow label="Vida" value={`${g.hp}/${maxHp(g)}`} n={g.attr.vida} onPlus={()=>g.addAttribute('vida')} disabled={!g.attributePoints}/><AttrRow label="Ataque" value={attackValue(g)} n={g.attr.ataque} onPlus={()=>g.addAttribute('ataque')} disabled={!g.attributePoints}/><AttrRow label="Defesa" value={defenseValue(g)} n={g.attr.defesa} onPlus={()=>g.addAttribute('defesa')} disabled={!g.attributePoints}/><h3 className="subhead">Progressão</h3><Stat label="Nível" value={li.lvl}/><div className="xp-track"><div style={{width:`${Math.min(100,li.progress/li.next*100)}%`}}/></div><Stat label="XP do nível" value={`${li.progress}/${li.next}`}/><Stat label="XP necessária para o próximo nível" value={li.next-li.progress}/><Stat label="Experiência total" value={g.xp}/><Stat label="Ouro" value={g.gold}/></Panel><Panel title="Habilidade do herói"><div className="ability"><Sparkles/><div><h3>{h.nome}</h3><p>{h.habilidade}</p></div></div><hr/><p className="muted">A habilidade ativa pode ser usada apenas uma vez por combate. A interface bloqueia novos cliques até a animação terminar.</p></Panel></div>}
function AttrRow({label,value,n,onPlus,disabled}:{label:string;value:any;n:number;onPlus:()=>void;disabled:boolean}){return <div className="attr-row"><div><span>{label}</span><strong>{value}</strong><small>Pontos aplicados: {n}</small></div><button disabled={disabled} onClick={onPlus}><Plus/></button></div>}
function InventoryScreen(){const g=useGame();const entries=Object.entries(g.inventory).filter(([,n])=>n>0);return <div className="two-col"><Panel title="Consumíveis">{entries.length===0?<Empty text="Nenhum consumível na mochila."/>:<div className="item-grid">{entries.map(([id,n])=>{const it=CONSUMABLES.find(x=>x.id===id)!;return <ItemCard key={id} image={cardArt(it)} rarity={cardRarity(it,'Consumível')} name={it.nome} subtitle={`Quantidade: ${n}`} footer={it.descricao}><button onClick={()=>g.useConsumable(id)}>Usar</button></ItemCard>})}</div>}</Panel><Panel title="Capacidade"><div className="capacity"><Package/><strong>{g.equipmentBag.length}/8 equipamentos guardados</strong></div><p>Consumíveis não ocupam esses 8 espaços. Equipamentos atualmente vestidos também não contam no limite.</p></Panel></div>}
function EquipmentScreen(){const g=useGame();return <div className="equipment-layout"><Panel title="Slots equipados"><div className="slot-grid">{SLOT_ORDER.map((slot)=>{const id=g.equipped[slot],e=EQUIPMENT.find(x=>x.id===id);if(!e)return <button key={slot} className={'slot '+(slot==='botas'?'boots':'')}><span>{slotNames[slot]}</span><div className="slot-empty">Vazio</div></button>;const effective=equipmentAttackForHero(e,g.heroId);const affinity=compatibilityLabel(e,g.heroId);return <button key={slot} className={'slot '+(slot==='botas'?'boots':'')} onClick={()=>g.unequip(slot)}><span>{slotNames[slot]}</span><ArtPreview className="slot-art-preview" image={cardArt(e)} name={e.nome} text={`${e.habilidade} • ${affinity}`} stats={`Ataque +${effective} • Defesa +${e.defesa} • Vida +${e.vida}`}/><div className="slot-info"><strong>{e.nome}</strong><div className="slot-stats">ATQ +{effective}{effective!==e.ataque?` (base +${e.ataque})`:''} • DEF +{e.defesa} • VIDA +{e.vida}</div><small className="slot-effect">{affinity}</small></div><small className="slot-remove">clique para retirar</small></button>})}</div></Panel><Panel title={`Equipamentos guardados ${g.equipmentBag.length}/8`}><div className="item-grid compact">{g.equipmentBag.map((id,idx)=>{const e=EQUIPMENT.find(x=>x.id===id)!;const effective=equipmentAttackForHero(e,g.heroId);return <ItemCard key={id+idx} image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} subtitle={slotNames[e.slot]} footer={`${e.habilidade} • ${compatibilityLabel(e,g.heroId)}`} previewStats={`Ataque +${effective}${effective!==e.ataque?` (base +${e.ataque})`:''} • Defesa +${e.defesa} • Vida +${e.vida}`}><button onClick={()=>g.equip(id)}>Equipar</button></ItemCard>})}</div></Panel></div>}
function ItemCard({image,name,subtitle,footer,previewStats,rarity='comum',children}:{image:string;name:string;subtitle?:string;footer?:string;previewStats?:string;rarity?:Rarity;children?:React.ReactNode}){const equipment=EQUIPMENT.find(item=>item.nome===name);const emblem=equipment?cardEmblem(equipment,'Equipamento'):undefined;const owner=equipment?.classeExclusiva??(equipment?equipmentAffinity(equipment):undefined);const emblemLabel=owner?classNames[owner]:'Universal';return <article className={`item-card item-rarity-${rarity}`}><div className="item-art-wrap"><ArtPreview image={image} name={name} text={footer} stats={previewStats??subtitle}/>{emblem&&<img className="item-class-emblem" src={'./'+emblem} alt={emblemLabel} title={`Classe: ${emblemLabel}`}/>}</div><div className="item-copy"><div className="item-title-row"><strong>{name}</strong><span className={`mini-rarity rarity-${rarity}`}>{rarityLabel[rarity]}</span></div>{subtitle&&<span>{subtitle}</span>}{footer&&<small>{footer}</small>}{children}</div></article>}
function ShopScreen(){
 const g=useGame()
 const [tab,setTab]=React.useState<ShopTab>('Armas')
 const [filter,setFilter]=React.useState('Todos')
 const ownedConsumables=Object.entries(g.inventory).filter(([,n])=>n>0).map(([id])=>CONSUMABLES.find(x=>x.id===id)).filter(Boolean) as typeof CONSUMABLES
 const ownedEquipment=g.equipmentBag.map(id=>EQUIPMENT.find(x=>x.id===id)).filter(Boolean) as typeof EQUIPMENT
 const availableConsumables=g.shopMode==='buy'?CONSUMABLES:ownedConsumables
 const availableEquipment=g.shopMode==='buy'?EQUIPMENT:ownedEquipment
 const weapons=availableEquipment.filter(e=>e.slot==='mao_direita')
 const gear=availableEquipment.filter(e=>e.slot!=='mao_direita')
 const tabCount=(target:ShopTab)=>target==='Armas'?weapons.length:target==='Equipamentos'?gear.length:availableConsumables.length
 const filters=tab==='Armas'?weaponFilters:tab==='Equipamentos'?equipmentFilters:consumableFilters
 const matchesWeapon=(e:any,id:string)=>id==='Todos'||(id==='neutra'?!equipmentAffinity(e):equipmentAffinity(e)===id)
 const matchesGear=(e:any,id:string)=>id==='Todos'||(id==='aneis'?(e.slot==='anel_1'||e.slot==='anel_2'):e.slot===id)
 const matchesConsumable=(item:any,id:string)=>id==='Todos'||(id==='cura'?(item.tipo==='cura'||item.tipo==='vida_max'):(item.tipo!=='cura'&&item.tipo!=='vida_max'))
 const equipment=tab==='Armas'?weapons.filter(e=>matchesWeapon(e,filter)):tab==='Equipamentos'?gear.filter(e=>matchesGear(e,filter)):[]
 const consumables=tab==='Consumíveis'?availableConsumables.filter(item=>matchesConsumable(item,filter)):[]
 const filterCount=(id:string)=>tab==='Armas'?weapons.filter(e=>matchesWeapon(e,id)).length:tab==='Equipamentos'?gear.filter(e=>matchesGear(e,id)).length:availableConsumables.filter(item=>matchesConsumable(item,id)).length
 const chooseTab=(next:ShopTab)=>{setTab(next);setFilter('Todos')}
 const changeMode=()=>{g.toggleShopMode();setFilter('Todos')}
 return <div><div className="shop-head"><div><h1>Loja de Eldravar</h1><p>Venda de itens não concede experiência.</p></div><div><span className="gold"><Coins/> {g.gold}</span><button onClick={changeMode}>{g.shopMode==='buy'?'Mudar para vender':'Mudar para comprar'}</button></div></div>
  <div className="shop-tabs" role="tablist" aria-label="Seções da loja">{shopTabs.map(item=><button key={item} role="tab" aria-selected={tab===item} className={tab===item?'active':''} onClick={()=>chooseTab(item)}>{item}<small>{tabCount(item)}</small></button>)}</div>
  <div className="gallery-filters shop-category-filters shop-subfilters" role="group" aria-label={`Filtros de ${tab}`}>{filters.map(([id,label])=><button key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>{label}<small>{filterCount(id)}</small></button>)}</div>
  <div className="shop-grid">{consumables.map(it=><ShopConsumable key={it.id} id={it.id} sell={g.shopMode==='sell'}/>)}{equipment.map((e,i)=><ShopEquipment key={e.id+i} id={e.id} sell={g.shopMode==='sell'}/>)}{!consumables.length&&!equipment.length&&<div className="shop-empty"><Package/><strong>Nenhum item neste filtro.</strong><span>{g.shopMode==='sell'?'Você ainda não possui itens desse tipo.':'Não há mercadorias disponíveis.'}</span></div>}</div>
 </div>
}
function ShopConsumable({id,sell=false}:{id:string;sell?:boolean}){const g=useGame(),it=CONSUMABLES.find(x=>x.id===id)!;const price=sell?Math.max(1,Math.floor(it.preco/2)):it.preco;return <ItemCard image={cardArt(it)} rarity={cardRarity(it,'Consumível')} name={it.nome} subtitle={`${price} ouro`} footer={it.descricao}><button disabled={!sell&&g.gold<price} onClick={()=>sell?g.sellConsumable(id):g.buyConsumable(id)}>{sell?'Vender':'Comprar'}</button></ItemCard>}
function ShopEquipment({id,sell=false}:{id:string;sell?:boolean}){const g=useGame(),e=EQUIPMENT.find(x=>x.id===id)!;const price=sell?Math.max(1,Math.floor(e.preco/2)):e.preco;const effective=equipmentAttackForHero(e,g.heroId);const affinity=compatibilityLabel(e,g.heroId);const allowed=equipmentClassAllowed(e,g.heroId);const levelAllowed=equipmentLevelAllowed(e,g.xp);const required=equipmentRequiredLevel(e);const button=sell?'Vender':!allowed?`Exclusivo: ${classNames[e.classeExclusiva!]}`:!levelAllowed?`Requer nível ${required}`:'Comprar';return <ItemCard image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} subtitle={`${slotNames[e.slot]} • Nível ${required} • ${price} ouro`} footer={`${e.habilidade} • ${affinity}`} previewStats={`Nível ${required} • Ataque +${effective}${effective!==e.ataque?` (base +${e.ataque})`:''} • Defesa +${e.defesa} • Vida +${e.vida}`}><button disabled={!sell&&(!allowed||!levelAllowed||g.gold<price||g.equipmentBag.length>=8)} onClick={()=>sell?g.sellEquipment(id):g.buyEquipment(id)}>{button}</button></ItemCard>}
function GalleryScreen(){const g=useGame();const [category,setCategory]=React.useState('Todos');const cards=category==='Todos'?allGallery:allGallery.filter(x=>x.kind===category);const idx=Math.max(0,Math.min(cards.length-1,g.selectedGallery));const c:any=cards[idx];const choose=(next:string)=>{setCategory(next);g.setSelectedGallery(0)};return <div className="gallery-page"><div className="gallery-filters" role="group" aria-label="Categorias da galeria">{galleryCategories.map(([id,label])=><button key={id} className={category===id?'active':''} onClick={()=>choose(id)}>{label}<small>{id==='Todos'?allGallery.length:allGallery.filter(x=>x.kind===id).length}</small></button>)}</div><div className="gallery"><Panel className="gallery-card"><CardFrame card={c} kind={c.kind}/></Panel><Panel title="Biblioteca de cartas"><div className={`badge rarity-${cardRarity(c,c.kind)}`}>{c.kind} • {rarityLabel[cardRarity(c,c.kind)]}</div><h1>{c.nome}</h1>{c.habilidade&&<p>{c.habilidade}</p>}{c.descricao&&<p>{c.descricao}</p>}<p className="muted">Carta {idx+1} de {cards.length} em {galleryCategories.find(([id])=>id===category)?.[1]}</p><div className="gallery-nav"><button onClick={()=>g.setSelectedGallery((idx-1+cards.length)%cards.length)}><ArrowLeft/>Anterior</button><button onClick={()=>g.setSelectedGallery((idx+1)%cards.length)}>Próxima<ArrowRight/></button></div><p className="hint">Escolha uma categoria acima ou navegue por todo o catálogo. Passe o mouse sobre a arte para ampliá-la.</p></Panel></div></div>}
function BossIntro(){const g=useGame(),e=g.enemy!,sub=SUBREGIONS.find(x=>x.id===g.subregionId);return <div className="boss-intro"><div className="boss-glow"/><Panel><div className="boss-intro-grid"><ArtPreview className="boss-art-preview" image={cardArt(e)} name={e.nome} text={e.habilidade} stats={artStats(e,'Chefe')}/><div><div className="badge danger">CHEFE DE {sub?.nome??'SUB-REGIÃO'}</div><h1>{e.nome}</h1><p>{e.habilidade}</p><div className="boss-stats"><Stat label="Vida" value={e.vida}/><Stat label="Ataque" value={e.ataque}/><Stat label="Nível" value={e.nivel??e.dificuldade}/><Stat label="Fases" value={e.maxFases??2}/><Stat label="Recompensa base" value={`${e.ouro} ouro + ${e.ouro} XP`}/></div><div className="actions-row"><button className="primary" onClick={g.startBoss}>Enfrentar</button><button onClick={()=>g.setScreen('region')}>Voltar</button></div></div></div></Panel></div>}
function CombatScreen(){
 const g=useGame(),h=HEROES.find(x=>x.id===g.heroId)!;const e=g.enemy
 if(!e){return <div className="combat-page premium-combat"><Panel title="Finalizando combate"><p className="muted">Preparando o resultado da batalha...</p></Panel></div>}
 const disabled=!g.playerTurn||g.animating
 const consumables=(Object.entries(g.inventory) as [string,number][]).filter(([,qty])=>qty>0).map(([id,qty])=>({item:CONSUMABLES.find(x=>x.id===id),qty})).filter(x=>x.item).slice(0,6) as {item:(typeof CONSUMABLES)[number],qty:number}[]
 return <div className="combat-page premium-combat combat-v033">
   <div className="combat-hero-area">
    <Fighter side="hero" classId={h.id} name={h.nome} image={cardArt(h)} hp={g.hp} max={maxHp(g)} attack={attackValue(g)} defense={defenseValue(g)} ability={h.habilidade} kind="HERÓI" rarity="HERÓICO" shaking={g.animating&&g.animationActor==='enemy'} damage={g.animating&&g.animationActor==='enemy'?g.lastDamage:undefined}/>
   </div>
   <div className="combat-enemy-area">
    <Fighter side="enemy" name={e.nome} image={cardArt(e)} hp={g.enemyHp} max={e.vida} attack={e.ataque} defense={Math.max(0,(e.dificuldade??1)-2)} ability={e.habilidade} kind={e.boss?'CHEFE':e.elite?'ELITE':'INIMIGO'} rarity={e.boss?'LENDÁRIO':e.elite?'RARO':'COMUM'} shaking={g.animating&&g.animationActor==='hero'} damage={g.animating&&g.animationActor==='hero'?g.lastDamage:undefined} boss={e.boss} phase={e.fase}/>
   </div>

   <Panel title="Efeitos ativos" className="effects-panel combat-effects-area">
      {g.shield>0?<div className="active-effect"><Shield/><div><strong>Escudo ativo</strong><small>Absorve até {g.shield} de dano.</small></div></div>:<p className="muted no-effect">Nenhum efeito defensivo ativo.</p>}
      <div className="active-effect passive"><Sparkles/><div><strong>{h.nome}</strong><small>{h.habilidade}</small></div></div>
   </Panel>

   <Panel title="Registro de combate" className="combat-log-panel combat-log-area">
    <div className="combat-log-turn" aria-label={`Turno ${g.combatTurn}`}><small>TURNO</small><strong>{g.combatTurn}</strong></div>
    <div className="combat-initiative"><span className={'coin '+(g.coin?'flipped':'')}>{g.coin==='cara'?'C':'K'}</span><small>{g.coin==='cara'?'Cara: herói iniciou':'Coroa: inimigo iniciou'}</small></div>
    <div className="combat-log premium-log">{g.combatLog.map((x,i)=><motion.p key={i+x} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}><span className="log-dot">◉</span>{x}</motion.p>)}</div>
   </Panel>

   <Panel title="Ações" className="combat-actions-panel combat-actions-area">
      <div className="combat-actions-grid">
       <button className="attack-btn premium-action" disabled={disabled} onClick={g.attack}><Sword/>Atacar</button>
       <button className="premium-action" disabled={disabled||g.heroSkillUsed} onClick={g.heroSkill}><Sparkles/>Habilidade do herói</button>
       <button className="premium-action" disabled={disabled||g.itemSkillUsed} onClick={g.itemSkill}><Shield/>Habilidade do item</button>
       <button className="premium-action" disabled={disabled} onClick={g.flee}><Footprints/>Fugir (60%)</button>
      </div>
   </Panel>

   <Panel className="combat-consumables-panel combat-consumables-area">
      <div className="consumables-head"><span>ITENS CONSUMÍVEIS</span><small>{consumables.length?`${consumables.length} tipos disponíveis`:'Nenhum item disponível'}</small></div>
      <div className="combat-consumables">
       {consumables.length?consumables.map(({item,qty})=><article key={item.id} className={`combat-consumable rarity-${cardRarity(item,'Consumível')}`} title={item.descricao}><span className="consumable-qty">{qty}</span><div className="combat-consumable-art"><ArtPreview image={cardArt(item)} name={item.nome} text={item.descricao} stats={`${item.tipo} • Valor ${item.valor} • Quantidade ${qty}`}/></div><strong>{item.nome}</strong><small>{item.descricao}</small><button disabled={disabled} onClick={()=>g.useConsumable(item.id)}>USAR</button></article>):<div className="consumables-empty"><FlaskConical/><span>Seus consumíveis aparecerão aqui durante o combate.</span></div>}
      </div>
   </Panel>

   <div className="combat-tip"><Sparkles size={15}/> Dica: use os consumíveis no momento certo — utilizar um item consome seu turno.</div>
 </div>}
function Fighter({side,classId,name,image,hp,max,attack,defense,ability,kind,rarity,shaking,boss,phase,damage}:{side:string;classId?:string;name:string;image:string;hp:number;max:number;attack:number;defense:number;ability:string;kind:string;rarity:string;shaking:boolean;boss?:boolean;phase?:number;damage?:number}){
 const galleryKind=side==='hero'?'Herói':boss?'Chefe':kind==='ELITE'?'Elite':'Monstro'
 const card={id:classId,nome:name,arte:image,habilidade:ability,ataque:attack,defesa:defense,vida:max,boss,elite:kind==='ELITE',raridade:side==='hero'?'heroico':boss?'lendario':kind==='ELITE'?'raro':'comum'}
 return <motion.article className={'fighter premium-fighter combat-card-fighter '+side+(boss?' boss':'')} animate={shaking?{x:[0,-9,8,-5,0]}:{x:0}} transition={{duration:.35}}>
  <CardFrame card={card} kind={galleryKind}/>
  {boss&&<small className="combat-card-phase">FASE {phase??1}</small>}
  {shaking&&damage!==undefined&&<motion.div className="floating-damage" initial={{opacity:0,y:10,scale:.7}} animate={{opacity:1,y:-45,scale:1.2}} transition={{duration:.5}}>-{damage}</motion.div>}
  <div className="hp-label"><span>Vida</span><strong>{Math.max(0,hp)}/{max}</strong></div><div className="hp-track"><motion.div animate={{width:`${Math.max(0,hp/max*100)}%`}} transition={{duration:.45}}/></div>
 </motion.article>
}
function LootScreen(){const g=useGame();const l=g.loot;const e=l?.equipmentId?EQUIPMENT.find(x=>x.id===l.equipmentId):undefined;const i=l?.itemId?CONSUMABLES.find(x=>x.id===l.itemId):undefined;return <div className="loot-page"><Panel><Trophy className="trophy"/><h1>{l?.title??'Vitória'}</h1><div className="loot-stats"><Stat label="Ouro recebido" value={`+${l?.gold??0}`}/><Stat label="Experiência recebida" value={`+${l?.xp??0}`}/>{e&&<ItemCard image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} subtitle="Equipamento obtido"/>}{i&&<ItemCard image={cardArt(i)} rarity={cardRarity(i,'Consumível')} name={i.nome} subtitle="Consumível obtido"/>}{!e&&!i&&<p className="muted">Nenhum item adicional foi encontrado.</p>}</div><button className="primary" onClick={g.finishLoot}>Voltar ao mapa</button></Panel></div>}
function Empty({text}:{text:string}){return <div className="empty"><Package/><p>{text}</p></div>}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
