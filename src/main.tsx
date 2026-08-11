import React from 'react'
import ReactDOM from 'react-dom/client'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Map, ScrollText, Backpack, Shield, ShoppingBag, Images, Menu, Sword, Sparkles, Coins, Trophy, Package, Plus, ArrowLeft, ArrowRight, FlaskConical, Footprints, Dices, Wand2, Upload, ImageOff, ZoomIn } from 'lucide-react'
import { useGame, HEROES, EQUIPMENT, CONSUMABLES, MONSTERS, TERRITORIES, SUBREGIONS, BOSSES, EVENTS, SLOT_ORDER, maxHp, attackValue, defenseValue, levelInfo, equipmentAffinity, equipmentAttackForHero, equipmentCompatibility, equipmentClassAllowed, equipmentRequiredLevel, equipmentLevelAllowed, equipmentBagCapacity } from './store/game'
import type { Slot, Rarity, Subregion } from './types'
import './styles.css'

const nav=[['map','Mapa',Map],['character','Ficha',ScrollText],['inventory','Mochila',Backpack],['equipment','Equipamentos',Shield],['shop','Loja',ShoppingBag],['gallery','Galeria',Images]] as const
const slotNames:Record<Slot,string>={amuleto:'Amuleto',capacete:'Capacete',bolsa:'Bolsa',anel_1:'Anel 1',peitoral:'Peitoral',anel_2:'Anel 2',calcas:'Calças',mao_esquerda:'Mão esquerda',mao_direita:'Mão direita',botas:'Botas'}
const classNames:Record<string,string>={guerreiro:'Guerreiro',guardiao:'Guardião',cacadora:'Ladino',arcanista:'Arcanista'}
function compatibilityLabel(e:any,heroId?:string){if(e.slot==='bolsa')return`Universal • Capacidade: ${e.capacidade??8} espaços`;if(e.classeExclusiva)return equipmentClassAllowed(e,heroId)?`Exclusivo: ${classNames[e.classeExclusiva]} • compatível`:`Exclusivo para ${classNames[e.classeExclusiva]}`;const c=equipmentCompatibility(e,heroId);if(!c.affinity)return'Arma neutra • sem penalidade de classe';return c.compatible?`Afinidade: ${classNames[c.affinity]} • bônus completo`:`Afinidade: ${classNames[c.affinity]} • penalidade: -${c.penalty} ATQ`}
const eliteGallery=MONSTERS.map(x=>({...x,id:`elite_${x.id}`,nome:`Elite: ${x.nome}`,ataque:Math.ceil(x.ataque*1.24),vida:Math.ceil(x.vida*1.55),ouro:Math.ceil(x.ouro*1.7),habilidade:`${x.habilidade} • Técnica de elite`,elite:true,raridade:'raro' as Rarity,kind:'Elite'}))
const allGallery=[...HEROES.map(x=>({...x,kind:'Herói'})),...EQUIPMENT.map(x=>({...x,kind:'Equipamento'})),...CONSUMABLES.map(x=>({...x,kind:'Consumível'})),...MONSTERS.map(x=>({...x,kind:'Monstro'})),...eliteGallery,...Object.values(BOSSES).map(x=>({...x,kind:'Chefe'})),...EVENTS.map(x=>({...x,kind:'Evento'}))]
const galleryCategories=[['Todos','Todas'],['Herói','Heróis'],['Equipamento','Equipamentos'],['Consumível','Consumíveis'],['Monstro','Monstros'],['Elite','Monstros de elite'],['Chefe','Chefes'],['Evento','Eventos']] as const
const shopTabs=['Armas','Equipamentos','Consumíveis'] as const
type ShopTab=typeof shopTabs[number]
const weaponFilters=[['Todos','Todas'],['guerreiro','Guerreiro'],['guardiao','Guardião'],['cacadora','Ladino'],['arcanista','Arcanista'],['neutra','Neutras']] as const
const equipmentFilters=[['Todos','Todos'],['bolsa','Bolsas'],['mao_esquerda','Mão esquerda'],['peitoral','Armaduras'],['capacete','Capacetes'],['calcas','Calças'],['botas','Botas'],['aneis','Anéis'],['amuleto','Amuletos']] as const
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
 if(kind==='Equipamento')return card.slot==='bolsa'?`Nível ${equipmentRequiredLevel(card)} • Capacidade ${card.capacidade??8} espaços`:`Nível ${equipmentRequiredLevel(card)} • Ataque +${card.ataque??0} • Defesa +${card.defesa??0} • Vida +${card.vida??0}`
 if(kind==='Consumível')return `${card.tipo??'Efeito'} • Valor ${card.valor??0}`
 if(kind==='Herói')return `Ataque ${card.ataque??0} • Vida ${card.vida??0}`
 return `Ataque ${card.ataque??0} • Vida ${card.vida??0}${card.ouro!==undefined?` • Recompensa ${card.ouro} ouro`:''}`
}
function assetUrl(path:string){return /^(data:|blob:|https?:)/.test(path)?path:'./'+path}
function EquipmentComparison({item,current,heroId}:{item:(typeof EQUIPMENT)[number];current?:typeof item;heroId?:string}){const values=(equipment:typeof item)=>({attack:equipmentAttackForHero(equipment,heroId),defense:equipment.defesa,life:equipment.vida,capacity:equipment.capacidade});const candidate=values(item),equipped=current?values(current):undefined;const metric=(label:string,value:number,currentValue?:number)=>{const delta=currentValue===undefined?0:value-currentValue;return <span><small>{label}</small><b>{value>=0?'+':''}{value}</b>{currentValue!==undefined&&delta!==0&&<em className={delta>0?'better':'worse'}>{delta>0?'+':''}{delta}</em>}</span>};return <section className="equipment-compare"><h3>Comparação de equipamentos</h3><div><article className="compare-candidate"><small>ITEM SELECIONADO</small><strong>{item.nome}</strong><div className="compare-stats">{item.slot==='bolsa'?metric('Espaços',candidate.capacity??8,equipped?.capacity):<>{metric('Ataque',candidate.attack,equipped?.attack)}{metric('Defesa',candidate.defense,equipped?.defense)}{metric('Vida',candidate.life,equipped?.life)}</>}</div><p><b>Habilidade</b>{item.habilidade}</p></article>{current?<article className="compare-equipped"><small>EQUIPADO AGORA</small><strong>{current.nome}</strong><div className="compare-stats">{current.slot==='bolsa'?metric('Espaços',equipped?.capacity??8):<>{metric('Ataque',equipped?.attack??0)}{metric('Defesa',equipped?.defense??0)}{metric('Vida',equipped?.life??0)}</>}</div><p><b>Habilidade</b>{current.habilidade}</p></article>:<article className="compare-empty"><small>EQUIPADO AGORA</small><strong>Slot vazio</strong><p>Nenhum item será substituído.</p></article>}</div></section>}
function ArtPreview({image,name,text,stats,className,imgStyle,compareEquipment=false}:{image:string;name:string;text?:string;stats?:string;className?:string;imgStyle?:React.CSSProperties;compareEquipment?:boolean}){
 const [open,setOpen]=React.useState(false)
 const equipped=useGame(state=>state.equipped),heroId=useGame(state=>state.heroId)
 React.useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[open])
 const equipment=(compareEquipment||className?.includes('slot-art-preview'))?EQUIPMENT.find(item=>item.nome===name):undefined
 const emblem=equipment?cardEmblem(equipment,'Equipamento'):undefined
 const owner=equipment?.classeExclusiva??(equipment?equipmentAffinity(equipment):undefined)
 const ownSlot=equipment&&(Object.entries(equipped) as [Slot,string][]).find(([,id])=>id===equipment.id)?.[0]
 const targetSlot=equipment?(ownSlot??(equipment.slot==='anel_1'&&equipped.anel_1?'anel_2':equipment.slot)):undefined
 const currentEquipment=targetSlot?EQUIPMENT.find(item=>item.id===equipped[targetSlot]):undefined
 const src=assetUrl(image)
 return <span className={`art-preview-trigger ${className??''}`} onClick={event=>{event.stopPropagation();setOpen(true)}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();setOpen(true)}}} role="button" tabIndex={0} aria-haspopup="dialog" aria-label={`Ampliar arte de ${name}`}>
  <img src={src} alt={name} style={imgStyle}/>
  {emblem&&<img className="slot-class-emblem" src={'./'+emblem} alt={owner?classNames[owner]:'Universal'} aria-hidden="true"/>}
  {open&&createPortal(<span className="art-preview-overlay" role="dialog" aria-modal="true" aria-label={`Arte completa de ${name}`} onClick={()=>setOpen(false)}><span className={`art-preview-card${equipment?' equipment-comparison-preview':''}`} onClick={event=>event.stopPropagation()}><img src={src} alt={name}/><span className="art-preview-copy"><button className="art-preview-close" onClick={()=>setOpen(false)} aria-label="Fechar visualização">×</button><small>ARTE COMPLETA</small><strong>{name}</strong>{text&&<span>{text}</span>}{stats&&<b>{stats}</b>}{equipment&&<EquipmentComparison item={equipment} current={currentEquipment} heroId={heroId}/>}<em>Clique fora da janela ou pressione Esc para fechar</em></span></span></span>,document.body)}
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
function CardFrame({card,kind,artStyle}:{card:any;kind:string;artStyle?:React.CSSProperties}){
 const rarity=cardRarity(card,kind),baseEffect=card.habilidade??card.descricao??'Sem efeito especial.',effect=kind==='Equipamento'?`Nível ${equipmentRequiredLevel(card)} • ${baseEffect}`:baseEffect
 const enemy=kind==='Monstro'||kind==='Elite'||kind==='Chefe'||card.boss||card.elite
 const attack=card.ataque??0,defense=card.defesa??(enemy?Math.max(0,(card.dificuldade??1)-2):0),life=card.vida??(kind==='Consumível'?card.valor??0:0)
 return <article className={`game-card ornate-card rarity-${rarity} ${enemy?'ornate-enemy':''}`}>
  <div className="ornate-art"><ArtPreview image={cardArt(card)} name={card.nome} text={artText(card)} stats={artStats(card,kind)} imgStyle={artStyle}/></div>
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
 const [fleeConfirm,setFleeConfirm]=React.useState(false)
 React.useEffect(()=>{if(g.screen!=='combat')setFleeConfirm(false)},[g.screen])
 React.useEffect(()=>{
  const handleEscape=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||document.querySelector('.art-preview-overlay'))return
   event.preventDefault()
   if(fleeConfirm){setFleeConfirm(false);return}
   if(g.screen==='combat'){setFleeConfirm(true);return}
   if(hero&&g.screen!=='map')g.setScreen('map')
  }
  document.addEventListener('keydown',handleEscape)
  return()=>document.removeEventListener('keydown',handleEscape)
 },[fleeConfirm,g.screen,hero,g.setScreen])
 return <div className="app-shell">
   {g.screen!=='menu'&&g.screen!=='select'&&g.screen!=='event'&&g.screen!=='cardCreator'&&<TopBar/>}
   <AnimatePresence mode="wait">
    <motion.main key={g.screen} className="screen" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.22}}>
      {g.screen==='menu'&&<MainMenu/>}{g.screen==='select'&&<HeroSelect/>}{g.screen==='map'&&<MapScreen/>}{g.screen==='region'&&<RegionScreen/>}{g.screen==='event'&&<EventScreen/>}{g.screen==='character'&&<CharacterScreen/>}{g.screen==='inventory'&&<InventoryScreen/>}{g.screen==='equipment'&&<EquipmentScreen/>}{g.screen==='shop'&&<ShopScreen/>}{g.screen==='gallery'&&<GalleryScreen/>}{g.screen==='combat'&&<CombatScreen/>}{g.screen==='bossIntro'&&<BossIntro/>}{g.screen==='loot'&&<LootScreen/>}{g.screen==='cardCreator'&&<CardCreatorScreen/>}
    </motion.main>
   </AnimatePresence>
   {fleeConfirm&&<div className="escape-confirm-overlay" role="presentation" onClick={()=>setFleeConfirm(false)}><section className="escape-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="escape-flee-title" onClick={event=>event.stopPropagation()}><Footprints/><small>ATALHO ESC DURANTE O COMBATE</small><h2 id="escape-flee-title">Tentar fugir?</h2><p>Um dado amarelo será rolado: <b>5–6</b> permite escapar, <b>4</b> mantém sua ação e <b>1–3</b> encerra seu turno.</p>{(!g.playerTurn||g.animating)&&<span>Aguarde o seu turno para tentar fugir.</span>}<div><button onClick={()=>setFleeConfirm(false)}>Continuar combate</button><button className="primary" disabled={!g.playerTurn||g.animating} onClick={()=>{setFleeConfirm(false);g.flee()}}><Footprints/>Rolar dado de fuga</button></div></section></div>}
   {hero&&g.screen!=='menu'&&g.screen!=='select'&&g.screen!=='cardCreator'&&<footer className="footer-tip">Bangalore's • Auto-save ativo • A aventura continua no próximo acesso.</footer>}
 </div>
}

function TopBar(){const g=useGame();const h=HEROES.find(x=>x.id===g.heroId);const level=levelInfo(g.xp).lvl;return <header className="topbar"><nav>{nav.map(([id,label,Icon])=><button key={id} className={(g.screen===id||(id==='map'&&g.screen==='region'))?'active':''} onClick={()=>g.setScreen(id)}><Icon size={18}/><span>{label}</span></button>)}</nav><div className="hud"><Heart className="heart" fill="currentColor"/><strong>{g.hp}/{maxHp(g)}</strong><span className="hud-level" title={`${g.xp} de experiência total`}><Sparkles size={16}/><small>NÍVEL</small><strong>{level}</strong></span><div className="brand">Bangalore's</div><button className="menu-mini" onClick={()=>g.setScreen('menu')}><Menu size={18}/>Menu</button></div></header>}
function MainMenu(){const g=useGame();const campaigns=Object.entries(g.campaigns).sort(([,a],[,b])=>(b.savedAt??0)-(a.savedAt??0));return <div className="hero-bg menu-hero"><div className="menu-atmosphere"/><section className={`menu-card${campaigns.length?' menu-with-campaigns':''}`}><p className="menu-eyebrow">AS CRÔNICAS DE ELDRAVAR</p><div className="brand big">Bangalore's</div><div className="menu-divider"><span/></div><p className="tagline">Um RPG de cartas, escolhas e conquistas</p><p className="menu-intro">Escolha seu herói, fortaleça seu arsenal e enfrente as criaturas que marcham sobre Eldravar.</p><div className="menu-actions">{g.heroId&&g.activeCampaignId&&<button className="primary" onClick={g.continueGame}>Continuar campanha atual</button>}<button onClick={()=>g.setScreen('select')}>Nova campanha</button><button className="ghost-action" onClick={()=>g.setScreen('cardCreator')}><Wand2 size={17}/>Criador de cartas</button></div>{campaigns.length>0&&<section className="campaign-library"><div className="campaign-library-title"><span>Campanhas salvas</span><small>{campaigns.length} {campaigns.length===1?'campanha':'campanhas'}</small></div><div className="campaign-list">{campaigns.map(([id,save])=>{const campaignHero=HEROES.find(hero=>hero.id===save.heroId),level=levelInfo(save.xp??0).lvl,active=id===g.activeCampaignId;return <article className={active?'active':''} key={id}><img src={campaignHero?assetUrl(cardArt(campaignHero)):''} alt=""/><div><strong>{campaignHero?.nome??'Herói desconhecido'}</strong><span>Nível {level} • {save.territory??'Campos Dourados'}</span><small>{active?'Campanha atual':`Salva em ${new Date(save.savedAt).toLocaleString('pt-BR')}`}</small></div><button className="campaign-load" onClick={()=>g.loadCampaign(id)}>{active?'Continuar':'Carregar'}</button><button className="campaign-delete" title="Excluir campanha" aria-label={`Excluir campanha de ${campaignHero?.nome??'herói'}`} onClick={()=>window.confirm('Excluir permanentemente esta campanha?')&&g.deleteCampaign(id)}>×</button></article>})}</div></section>}{campaigns.length>0&&<button className="danger-link clear-campaigns" onClick={()=>window.confirm('Apagar todas as campanhas salvas?')&&g.clearSave()}>Apagar todas as campanhas</button>}<p className="save-note"><span>◆</span> Cada campanha é salva automaticamente neste navegador.</p></section><aside className="menu-scene-caption"><small>A GUERRA POR ELDRAVAR</small><strong>O reino precisa de um novo campeão.</strong></aside></div>}
function HeroSelect(){const g=useGame();const [selected,setSelected]=React.useState<(typeof HEROES)[number]>();React.useEffect(()=>{if(!selected)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setSelected(undefined)};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[selected]);return <div className="select-page"><button className="hero-select-back" onClick={()=>g.setScreen('menu')}><ArrowLeft/>Voltar ao menu</button><div className="section-title"><h1>Escolha seu herói</h1><p>Conheça os atributos e a habilidade de cada classe. Clique na imagem para selecionar.</p></div><div className="hero-grid">{HEROES.map(h=><motion.article whileHover={{y:-6}} className="hero-card hero-choice-card" key={h.id}><button className="hero-select-image" onClick={()=>setSelected(h)} aria-label={`Selecionar ${h.nome}`}><img src={assetUrl(cardArt(h))} alt={h.nome}/><span>Selecionar herói</span></button><div className="hero-choice-copy"><h2>{h.nome}</h2><div className="hero-choice-stats"><span><Sword/><small>Ataque</small><strong>{h.ataque}</strong></span><span><Shield/><small>Defesa</small><strong>{(h as any).defesa??0}</strong></span><span><Heart/><small>Vida</small><strong>{h.vida}</strong></span></div><section className="hero-choice-ability"><small>HABILIDADE</small><p>{h.habilidade}</p></section></div></motion.article>)}</div>{selected&&<div className="hero-confirm-overlay" role="presentation" onClick={()=>setSelected(undefined)}><section className="hero-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="hero-confirm-title" onClick={event=>event.stopPropagation()}><img src={assetUrl(cardArt(selected))} alt=""/><div><small>CONFIRMAR PERSONAGEM</small><h2 id="hero-confirm-title">Escolher {selected.nome}?</h2><p>{selected.habilidade}</p><div><button onClick={()=>setSelected(undefined)}>Voltar</button><button className="primary" onClick={()=>g.newGame(selected.id)}>Iniciar aventura</button></div></div></section></div>}</div>}
function Panel({title,children,className=''}:{title?:string;children:React.ReactNode;className?:string}){return <section className={'panel '+className}>{title&&<h2 className="panel-title">{title}</h2>}{children}</section>}
function MapScreen(){const g=useGame();const li=levelInfo(g.xp);return <div className="map-layout"><Panel className="map-panel"><div className="map-wrap"><img src="./assets/maps/eldravar.png" alt="Mapa de Eldravar"/>{TERRITORIES.map(t=>{const subs=SUBREGIONS.filter(s=>s.regionId===t.id);const completed=subs.length>0&&subs.every(s=>g.subregionBossesDefeated.includes(s.id));return <button key={t.id} className={`map-sub-pin map-territory-pin${completed?' completed':''}`} style={{left:`${t.x*100}%`,top:`${t.y*100}%`}} onClick={()=>g.openRegion(t)} title={`Explorar ${t.nome}`} aria-label={`Explorar território ${t.nome}`}><span>{completed?'✓':'◆'}</span><b>{t.nome}</b></button>})}{SUBREGIONS.map(sub=>{const point=SUBREGION_MAP_POINTS[sub.id];if(!point)return null;const completed=g.subregionBossesDefeated.includes(sub.id);return <button key={`sub_${sub.id}`} className={`map-sub-pin${completed?' completed':''}`} style={{left:`${point[0]*100}%`,top:`${point[1]*100}%`}} onClick={()=>g.openSubregion(sub.id)} title={`Acessar diretamente: ${sub.nome}`} aria-label={`Acessar ${sub.nome}`}><span>{completed?'✓':'◆'}</span><b>{sub.nome}</b></button>})}</div></Panel><Panel title="Resumo do herói" className="summary"><Stat label="Vida" value={`${g.hp}/${maxHp(g)}`}/><Stat label="Ataque" value={attackValue(g)}/><Stat label="Defesa" value={defenseValue(g)}/><Stat label="Ouro" value={g.gold}/><Stat label="Equip. guardados" value={`${g.equipmentBag.length}/${equipmentBagCapacity(g)}`}/><hr/><div className="level-row"><strong>Nível {li.lvl}</strong><span>{li.progress}/{li.next} XP</span></div><div className="xp-track"><div style={{width:`${Math.min(100,li.progress/li.next*100)}%`}}/></div><p className="muted">Experiência total: {g.xp}</p><p className={g.attributePoints?'points hot':'points'}>Pontos de atributo: {g.attributePoints}</p><hr/><strong>Exploração de Eldravar</strong><p className="muted">Todos os losangos dão acesso a territórios ou locais específicos.</p><p className="hint">Passe o mouse para identificar o destino. Um marcador verde indica que seus chefes já foram derrotados.</p></Panel></div>}

function dangerFor(level:number,min:number,max:number){if(level<min-2)return {label:'PERIGO EXTREMO',stars:5,cls:'deadly'};if(level<min)return {label:'Difícil',stars:4,cls:'hard'};if(level<=max)return {label:'Adequado',stars:3,cls:'fair'};if(level<=max+3)return {label:'Fácil',stars:2,cls:'easy'};return {label:'Muito fácil',stars:1,cls:'easy'}}
function RegionScreen(){const g=useGame();const region=TERRITORIES.find(t=>t.id===g.regionId)??TERRITORIES[0];const lvl=levelInfo(g.xp).lvl;const subs=SUBREGIONS.filter(s=>s.regionId===region.id);return <div className="region-page"><Panel className="region-head"><button className="region-back" onClick={()=>g.setScreen('map')}><ArrowLeft/>Mapa</button><div><span className="eyebrow">REGIÃO</span><h1>{region.nome}</h1><p>{region.descricao}</p></div><div className="region-level"><small>Nível recomendado</small><strong>{region.nivelMin}–{region.nivelMax}</strong><span>Seu nível: {lvl}</span></div></Panel>{g.explorationNote&&<div className="exploration-note"><Sparkles/>{g.explorationNote}</div>}<div className="subregion-grid">{subs.map(sub=><SubregionCard key={sub.id} sub={sub} level={lvl}/>)}</div></div>}
function EventScreen(){const g=useGame();const event=g.currentEvent??EVENTS[0];const result=g.eventResult;return <div className="event-page"><div className="event-backdrop"/><Panel className="event-card-panel"><span className="eyebrow">ENCONTRO DE EXPLORAÇÃO</span><div className="event-layout"><div className="event-art"><img src={'./'+(event.arte??event.imagem)} alt={event.nome}/><span>MISSÃO</span></div><div className="event-copy"><ScrollText className="event-icon"/><h1>{event.nome}</h1><p className="event-description">{event.descricao}</p>{!result?<><div className="event-warning"><Dices/><div><strong>O destino pode exigir uma rolagem</strong><small>Resultados de 4 a 6 representam sucesso nas missões de risco.</small></div></div><div className="event-actions"><button className="primary" onClick={()=>g.resolveEvent(true)}>ACEITAR MISSÃO</button><button onClick={()=>g.resolveEvent(false)}>SEGUIR VIAGEM</button></div></>:<div className={`event-result ${result.tone}`}>{result.roll&&<div className="event-die"><Dices/><span>{result.roll}</span></div>}<div><small>RESULTADO</small><strong>{result.message}</strong></div><button className="primary" onClick={g.finishEvent}>CONTINUAR EXPLORAÇÃO</button></div>}</div></div></Panel></div>}
function SubregionCard({sub,level}:{sub:Subregion;level:number}){const g=useGame();const wins=g.subregionVictories[sub.id]??0;const bossDown=g.subregionBossesDefeated.includes(sub.id);const danger=dangerFor(level,sub.nivelMin,sub.nivelMax);const ready=wins>=sub.encontrosNecessarios&&!bossDown;return <motion.article whileHover={{y:-4}} className={`subregion-card danger-${danger.cls}`}><div className="subregion-top"><span className="subregion-icon">{sub.icone}</span><div><h2>{sub.nome}</h2><p>Nível {sub.nivelMin}–{sub.nivelMax}</p></div><span className={`danger-badge ${danger.cls}`}>{danger.label}</span></div><p className="subregion-desc">{sub.descricao}</p><div className="subregion-progress"><div><span>Exploração</span><strong>{Math.min(wins,sub.encontrosNecessarios)}/{sub.encontrosNecessarios}</strong></div><div className="xp-track"><div style={{width:`${Math.min(100,wins/sub.encontrosNecessarios*100)}%`}}/></div></div><div className="subregion-meta"><span>★{'★'.repeat(Math.max(0,danger.stars-1))}{'☆'.repeat(Math.max(0,5-danger.stars))}</span><span>{bossDown?'✓ Chefe derrotado':ready?'CHEFE DISPONÍVEL':'Chefe oculto'}</span></div><div className="subregion-details"><small><b>Loot:</b> {sub.temaLoot}</small><small><b>Desafios:</b> {sub.desafios.slice(0,3).join(' • ')}</small></div><button className={ready?'primary boss-button':'primary'} onClick={()=>g.startEncounter(sub.id)}>{bossDown?'Explorar novamente':ready?'ENFRENTAR CHEFE':'EXPLORAR'}</button></motion.article>}

function Stat({label,value}:{label:string;value:React.ReactNode}){return <div className="stat"><span>{label}</span><strong>{value}</strong></div>}
function CharacterScreen(){const g=useGame();const h=HEROES.find(x=>x.id===g.heroId)!;const li=levelInfo(g.xp);return <div className="char-grid"><Panel className="portrait-panel"><ArtPreview className="portrait" image={cardArt(h)} name={h.nome} text={h.habilidade} stats={`Ataque ${attackValue(g)} • Defesa ${defenseValue(g)} • Vida ${maxHp(g)}`}/><h1>{h.nome}</h1><p>{h.habilidade}</p><div className="points-box">Pontos disponíveis <strong>{g.attributePoints}</strong></div></Panel><Panel title="Atributos"><AttrRow label="Vida" value={`${g.hp}/${maxHp(g)}`} n={g.attr.vida} onPlus={()=>g.addAttribute('vida')} disabled={!g.attributePoints}/><AttrRow label="Ataque" value={attackValue(g)} n={g.attr.ataque} onPlus={()=>g.addAttribute('ataque')} disabled={!g.attributePoints}/><AttrRow label="Defesa" value={defenseValue(g)} n={g.attr.defesa} onPlus={()=>g.addAttribute('defesa')} disabled={!g.attributePoints}/><h3 className="subhead">Progressão</h3><Stat label="Nível" value={li.lvl}/><div className="xp-track"><div style={{width:`${Math.min(100,li.progress/li.next*100)}%`}}/></div><Stat label="XP do nível" value={`${li.progress}/${li.next}`}/><Stat label="XP necessária para o próximo nível" value={li.next-li.progress}/><Stat label="Experiência total" value={g.xp}/><Stat label="Ouro" value={g.gold}/></Panel><Panel title="Habilidade do herói"><div className="ability"><Sparkles/><div><h3>{h.nome}</h3><p>{h.habilidade}</p></div></div><hr/><p className="muted">A habilidade ativa pode ser usada apenas uma vez por combate. A interface bloqueia novos cliques até a animação terminar.</p></Panel></div>}
function AttrRow({label,value,n,onPlus,disabled}:{label:string;value:any;n:number;onPlus:()=>void;disabled:boolean}){return <div className="attr-row"><div><span>{label}</span><strong>{value}</strong><small>Pontos aplicados: {n}</small></div><button disabled={disabled} onClick={onPlus}><Plus/></button></div>}
function InventoryScreen(){const g=useGame();const entries=Object.entries(g.inventory).filter(([,n])=>n>0);const capacity=equipmentBagCapacity(g);const backpack=EQUIPMENT.find(e=>e.id===g.equipped.bolsa);return <div className="two-col"><Panel title="Consumíveis">{entries.length===0?<Empty text="Nenhum consumível na mochila."/>:<div className="item-grid">{entries.map(([id,n])=>{const it=CONSUMABLES.find(x=>x.id===id)!;return <ItemCard key={id} image={cardArt(it)} rarity={cardRarity(it,'Consumível')} name={it.nome} subtitle={`Quantidade: ${n}`} footer={it.descricao}><button onClick={()=>g.useConsumable(id)}>Usar</button></ItemCard>})}</div>}</Panel><Panel title="Capacidade"><div className="capacity"><Package/><strong>{g.equipmentBag.length}/{capacity} equipamentos guardados</strong></div><p><b>{backpack?.nome??'Mochila Pequena'}:</b> {capacity} espaços. Consumíveis e equipamentos vestidos não ocupam esse limite.</p></Panel></div>}
function EquipmentScreen(){const g=useGame();const capacity=equipmentBagCapacity(g);return <div className="equipment-layout"><Panel title="Slots equipados"><div className="slot-grid">{SLOT_ORDER.map((slot)=>{const id=g.equipped[slot],e=EQUIPMENT.find(x=>x.id===id);if(!e)return <button key={slot} className={'slot '+(slot==='botas'?'boots':'')}><span>{slotNames[slot]}</span><div className="slot-empty">Vazio</div></button>;const effective=equipmentAttackForHero(e,g.heroId);const affinity=compatibilityLabel(e,g.heroId);const bagSlot=slot==='bolsa';const stats=bagSlot?`${e.capacidade??8} espaços`:`Ataque +${effective} • Defesa +${e.defesa} • Vida +${e.vida}`;return <button key={slot} className={'slot '+(slot==='botas'?'boots':'')+(bagSlot?' backpack-slot':'')} onClick={bagSlot?undefined:()=>g.unequip(slot)}><span>{slotNames[slot]}</span><ArtPreview className="slot-art-preview" image={cardArt(e)} name={e.nome} text={`${e.habilidade} • ${affinity}`} stats={stats}/><div className="slot-info"><strong>{e.nome}</strong><div className="slot-stats">{bagSlot?`CAPACIDADE ${e.capacidade??8}`:<>ATQ +{effective}{effective!==e.ataque?` (base +${e.ataque})`:''} • DEF +{e.defesa} • VIDA +{e.vida}</>}</div><small className="slot-effect">{affinity}</small></div><small className="slot-remove">{bagSlot?'equipe outra bolsa para trocar':'clique para retirar'}</small></button>})}</div></Panel><Panel title={`Equipamentos guardados ${g.equipmentBag.length}/${capacity}`}><div className="item-grid compact">{g.equipmentBag.map((id,idx)=>{const e=EQUIPMENT.find(x=>x.id===id)!;const effective=equipmentAttackForHero(e,g.heroId);const allowed=equipmentClassAllowed(e,g.heroId);const levelAllowed=equipmentLevelAllowed(e,g.xp);const required=equipmentRequiredLevel(e);const fits=e.slot!=='bolsa'||g.equipmentBag.length<=(e.capacidade??8);const equipLabel=!allowed?'Impossível equipar':!levelAllowed?`Requer nível ${required}`:!fits?`Reduza para ${e.capacidade} itens`:'Equipar';const stats=e.slot==='bolsa'?`Capacidade ${e.capacidade??8} espaços`:`Ataque +${effective}${effective!==e.ataque?` (base +${e.ataque})`:''} • Defesa +${e.defesa} • Vida +${e.vida}`;return <ItemCard key={id+idx} image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} subtitle={e.slot==='bolsa'?`${e.capacidade} espaços`:slotNames[e.slot]} footer={`${e.habilidade} • ${compatibilityLabel(e,g.heroId)}`} previewStats={stats}><button className={!allowed||!fits?'equip-impossible':!levelAllowed?'equip-level-locked':''} disabled={!allowed||!levelAllowed||!fits} title={!allowed?compatibilityLabel(e,g.heroId):!levelAllowed?`Disponível no nível ${required}`:!fits?'Há equipamentos demais para esta bolsa':undefined} onClick={()=>g.equip(id)}>{equipLabel}</button></ItemCard>})}</div></Panel></div>}
function ItemCard({image,name,subtitle,footer,previewStats,rarity='comum',children}:{image:string;name:string;subtitle?:string;footer?:string;previewStats?:string;rarity?:Rarity;children?:React.ReactNode}){const equipment=EQUIPMENT.find(item=>item.nome===name);const emblem=equipment?cardEmblem(equipment,'Equipamento'):undefined;const owner=equipment?.classeExclusiva??(equipment?equipmentAffinity(equipment):undefined);const emblemLabel=owner?classNames[owner]:'Universal';return <article className={`item-card item-rarity-${rarity}`}><div className="item-art-wrap"><ArtPreview image={image} name={name} text={footer} stats={previewStats??subtitle} compareEquipment={Boolean(equipment)}/>{emblem&&<img className="item-class-emblem" src={'./'+emblem} alt={emblemLabel} title={`Classe: ${emblemLabel}`}/>}</div><div className="item-copy"><div className="item-title-row"><strong>{name}</strong><span className={`mini-rarity rarity-${rarity}`}>{rarityLabel[rarity]}</span></div>{subtitle&&<span>{subtitle}</span>}{footer&&<small>{footer}</small>}{children}</div></article>}
function ShopScreen(){
 const g=useGame()
 const [tab,setTab]=React.useState<ShopTab>('Armas')
 const [filter,setFilter]=React.useState('Todos')
 const ownedConsumables=Object.entries(g.inventory).filter(([,n])=>n>0).map(([id])=>CONSUMABLES.find(x=>x.id===id)).filter(Boolean) as typeof CONSUMABLES
 const ownedEquipment=g.equipmentBag.map(id=>EQUIPMENT.find(x=>x.id===id)).filter(Boolean) as typeof EQUIPMENT
 const availableConsumables=g.shopMode==='buy'?CONSUMABLES:ownedConsumables
 const availableEquipment=g.shopMode==='buy'?EQUIPMENT:ownedEquipment
 const weapons=availableEquipment.filter(e=>e.slot==='mao_direita')
 const gear=availableEquipment.filter(e=>e.slot!=='mao_direita'&&(!e.classeExclusiva||e.classeExclusiva===g.heroId))
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
function ShopEquipment({id,sell=false}:{id:string;sell?:boolean}){const g=useGame(),e=EQUIPMENT.find(x=>x.id===id)!;const price=sell?Math.max(1,Math.floor(e.preco/2)):e.preco;const effective=equipmentAttackForHero(e,g.heroId);const affinity=compatibilityLabel(e,g.heroId);const allowed=equipmentClassAllowed(e,g.heroId);const levelAllowed=equipmentLevelAllowed(e,g.xp);const required=equipmentRequiredLevel(e);const button=sell?'Vender':!allowed?`Exclusivo: ${classNames[e.classeExclusiva!]}`:!levelAllowed?`Requer nível ${required}`:'Comprar';const stats=e.slot==='bolsa'?`Nível ${required} • Capacidade ${e.capacidade??8} espaços`:`Nível ${required} • Ataque +${effective}${effective!==e.ataque?` (base +${e.ataque})`:''} • Defesa +${e.defesa} • Vida +${e.vida}`;return <ItemCard image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} subtitle={`${slotNames[e.slot]} • Nível ${required} • ${price} ouro`} footer={`${e.habilidade} • ${affinity}`} previewStats={stats}><button disabled={!sell&&(!allowed||!levelAllowed||g.gold<price||g.equipmentBag.length>=equipmentBagCapacity(g))} onClick={()=>sell?g.sellEquipment(id):g.buyEquipment(id)}>{button}</button></ItemCard>}
function GalleryScreen(){const g=useGame();const [category,setCategory]=React.useState('Todos');const cards=category==='Todos'?allGallery:allGallery.filter(x=>x.kind===category);const idx=Math.max(0,Math.min(cards.length-1,g.selectedGallery));const c:any=cards[idx];const choose=(next:string)=>{setCategory(next);g.setSelectedGallery(0)};return <div className="gallery-page"><div className="gallery-filters" role="group" aria-label="Categorias da galeria">{galleryCategories.map(([id,label])=><button key={id} className={category===id?'active':''} onClick={()=>choose(id)}>{label}<small>{id==='Todos'?allGallery.length:allGallery.filter(x=>x.kind===id).length}</small></button>)}</div><div className="gallery"><Panel className="gallery-card"><CardFrame card={c} kind={c.kind}/></Panel><Panel title="Biblioteca de cartas"><div className={`badge rarity-${cardRarity(c,c.kind)}`}>{c.kind} • {rarityLabel[cardRarity(c,c.kind)]}</div><h1>{c.nome}</h1>{c.habilidade&&<p>{c.habilidade}</p>}{c.descricao&&<p>{c.descricao}</p>}<p className="muted">Carta {idx+1} de {cards.length} em {galleryCategories.find(([id])=>id===category)?.[1]}</p><div className="gallery-nav"><button onClick={()=>g.setSelectedGallery((idx-1+cards.length)%cards.length)}><ArrowLeft/>Anterior</button><button onClick={()=>g.setSelectedGallery((idx+1)%cards.length)}>Próxima<ArrowRight/></button></div><p className="hint">Escolha uma categoria acima ou navegue por todo o catálogo. Clique sobre a arte para ampliá-la.</p></Panel></div></div>}
function BossIntro(){const g=useGame(),e=g.enemy!,sub=SUBREGIONS.find(x=>x.id===g.subregionId);return <div className="boss-intro"><div className="boss-glow"/><Panel><div className="boss-intro-grid"><ArtPreview className="boss-art-preview" image={cardArt(e)} name={e.nome} text={e.habilidade} stats={artStats(e,'Chefe')}/><div><div className="badge danger">CHEFE DE {sub?.nome??'SUB-REGIÃO'}</div><h1>{e.nome}</h1><p>{e.habilidade}</p><div className="boss-stats"><Stat label="Vida" value={e.vida}/><Stat label="Ataque" value={e.ataque}/><Stat label="Nível" value={e.nivel??e.dificuldade}/><Stat label="Fases" value={e.maxFases??2}/><Stat label="Recompensa base" value={`${e.ouro} ouro + ${e.ouro} XP`}/></div><div className="actions-row"><button className="primary" onClick={g.startBoss}>Enfrentar</button><button onClick={()=>g.setScreen('region')}>Voltar</button></div></div></div></Panel></div>}
function CombatDiceRoll({roll}:{roll:{attacker:'hero'|'enemy';naturalAttackRoll:number;attackRoll:number;attackBonus:number;defenseRoll:number;attackBase:number;defenseBase:number;attackEffect:string;defenseEffect:string;damage:number;selfDamage:number;shieldBlocked?:number}}){
 const attackDie=<div className="combat-roll-side attack-side"><span>ATAQUE • BASE {roll.attackBase}</span><motion.b className="combat-die attack-die" animate={{rotate:[0,110,250,370,360],scale:[.75,1.18,.88,1]}} transition={{duration:.55}}>{roll.attackRoll}</motion.b><em><strong>{roll.attackEffect}</strong>{roll.attackBonus>0&&<u>Rolagem {roll.naturalAttackRoll} + {roll.attackBonus}</u>}</em></div>
 const defenseDie=<div className="combat-roll-side defense-side"><span>DEFESA • BASE {roll.defenseBase}</span><motion.b className="combat-die defense-die" animate={{rotate:[0,-120,-260,-370,-360],scale:[.75,1.18,.88,1]}} transition={{duration:.55}}>{roll.defenseRoll}</motion.b><em><strong>{roll.attackRoll===1?'Não se aplica':roll.defenseEffect}</strong></em></div>
 return <motion.aside className={`combat-dice-roll ${roll.attacker}`} initial={{opacity:0,y:-18,scale:.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-12}} aria-live="assertive"><small>{roll.attacker==='hero'?'SEU TESTE DE ATAQUE':'ATAQUE DO INIMIGO'}</small><div className="combat-dice-pair">{roll.attacker==='hero'?<>{attackDie}<i>VS</i>{defenseDie}</>:<>{defenseDie}<i>VS</i>{attackDie}</>}</div><p>{roll.selfDamage?'FALHA CRÍTICA — DANO NO ATACANTE':'DANO'} <strong>{roll.selfDamage||roll.damage}</strong>{roll.shieldBlocked?` • ESCUDO BLOQUEOU ${roll.shieldBlocked}`:''}</p></motion.aside>
}
function FleeDiceRoll({roll}:{roll:{roll:number;outcome:'failed'|'neutral'|'success'}}){const message=roll.outcome==='success'?'Fuga bem-sucedida!':roll.outcome==='neutral'?'Você mantém sua ação':'Fuga falhou — turno perdido';return <motion.aside className={`flee-dice-roll ${roll.outcome}`} initial={{opacity:0,scale:.88}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.92}} aria-live="assertive"><small>TESTE DE FUGA</small><motion.b className="combat-die flee-die" animate={{rotate:[0,130,280,420,360],scale:[.7,1.22,.88,1]}} transition={{duration:.65}}>{roll.roll}</motion.b><strong>{message}</strong><span>1–3 perde o turno • 4 mantém a ação • 5–6 foge</span></motion.aside>}
function CombatScreen(){
 const g=useGame(),h=HEROES.find(x=>x.id===g.heroId)!;const e=g.enemy
 if(!e){return <div className="combat-page premium-combat"><Panel title="Finalizando combate"><p className="muted">Preparando o resultado da batalha...</p></Panel></div>}
 const disabled=!g.playerTurn||g.animating
 const consumables=(Object.entries(g.inventory) as [string,number][]).filter(([,qty])=>qty>0).map(([id,qty])=>({item:CONSUMABLES.find(x=>x.id===id),qty})).filter(x=>x.item).slice(0,6) as {item:(typeof CONSUMABLES)[number],qty:number}[]
 const itemAbilities=(Object.values(g.equipped) as (string|undefined)[]).map(id=>EQUIPMENT.find(item=>item.id===id)).filter((item):item is (typeof EQUIPMENT)[number]=>Boolean(item?.habilidade&&item.slot!=='bolsa'))
 return <div className="combat-page premium-combat combat-v033">
   <div className="combat-hero-area">
    <Fighter side="hero" classId={h.id} name={h.nome} image={cardArt(h)} hp={g.hp} max={maxHp(g)} attack={attackValue(g)} defense={defenseValue(g)} ability={h.habilidade} kind="HERÓI" rarity="HERÓICO" shaking={g.animating&&g.animationActor==='enemy'} damage={g.animating&&g.animationActor==='enemy'?g.lastDamage:undefined}/>
   </div>
   <div className="combat-enemy-area">
    <Fighter side="enemy" name={e.nome} image={cardArt(e)} hp={g.enemyHp} max={e.vida} attack={e.ataque} defense={Math.max(0,(e.dificuldade??1)-2)} ability={e.habilidade} kind={e.boss?'CHEFE':e.elite?'ELITE':'INIMIGO'} rarity={e.boss?'LENDÁRIO':e.elite?'RARO':'COMUM'} shaking={g.animating&&g.animationActor==='hero'} damage={g.animating&&g.animationActor==='hero'?g.lastDamage:undefined} boss={e.boss} phase={e.fase}/>
   </div>

   <Panel title="Habilidades dos itens" className="effects-panel combat-effects-area">
      {g.shield>0?<div className="active-effect"><Shield/><div><strong>Escudo ativo</strong><small>Absorve até {g.shield} de dano.</small></div></div>:<p className="muted no-effect">Nenhum efeito defensivo ativo.</p>}
      <div className="combat-item-abilities">{itemAbilities.length?itemAbilities.map(item=><div className="active-effect passive" key={item.id}><Sparkles/><div><strong>{item.nome}</strong><small>{item.habilidade}</small></div></div>):<p className="muted no-effect">Nenhum equipamento com habilidade.</p>}</div>
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
       <button className="premium-action" disabled={disabled} onClick={g.flee}><Footprints/>Tentar fugir</button>
      </div>
   </Panel>

   <Panel title="Rolagem dos dados" className="combat-dice-panel combat-dice-area">
    <AnimatePresence mode="wait">{g.fleeRoll&&g.animating?<FleeDiceRoll key={`flee-${g.combatTurn}-${g.fleeRoll.roll}`} roll={g.fleeRoll}/>:g.combatRoll&&g.animating?<CombatDiceRoll key={`${g.combatTurn}-${g.combatRoll.attacker}`} roll={g.combatRoll}/>:<motion.div className="combat-dice-idle" initial={{opacity:0}} animate={{opacity:1}}><Dices/><strong>Aguardando a próxima jogada</strong><small>Os resultados de ataque, defesa e fuga aparecerão aqui.</small></motion.div>}</AnimatePresence>
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
type DraftKind='Herói'|'Equipamento'|'Consumível'|'Monstro'|'Elite'|'Chefe'|'Evento'
const creatorKinds:DraftKind[]=['Herói','Equipamento','Consumível','Monstro','Elite','Chefe','Evento']
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v))
const maxPan=(zoom:number)=>50*(zoom-1)/zoom
function artTransform(zoom:number,panX:number,panY:number):React.CSSProperties{
 return {objectFit:'cover',objectPosition:'50% 50%',transform:`scale(${zoom}) translate(${panX}%,${panY}%)`,transformOrigin:'center'}
}
function ArtPositionEditor({src,zoom,panX,panY,onPan}:{src:string;zoom:number;panX:number;panY:number;onPan:(x:number,y:number)=>void}){
 const boxRef=React.useRef<HTMLDivElement>(null)
 const drag=React.useRef<{active:boolean;x:number;y:number;panX:number;panY:number}>({active:false,x:0,y:0,panX:0,panY:0})
 const onPointerDown=(e:React.PointerEvent)=>{ drag.current={active:true,x:e.clientX,y:e.clientY,panX,panY}; (e.target as Element).setPointerCapture(e.pointerId) }
 const onPointerMove=(e:React.PointerEvent)=>{
  if(!drag.current.active||!boxRef.current)return
  const rect=boxRef.current.getBoundingClientRect()
  const dx=e.clientX-drag.current.x, dy=e.clientY-drag.current.y
  const limit=maxPan(zoom)
  const nx=clamp(drag.current.panX+(dx/rect.width)*100/zoom,-limit,limit)
  const ny=clamp(drag.current.panY+(dy/rect.height)*100/zoom,-limit,limit)
  onPan(nx,ny)
 }
 const onPointerUp=()=>{ drag.current.active=false }
 return <div ref={boxRef} className="art-editor-box" onPointerDown={src?onPointerDown:undefined} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
  {src?<img src={src} alt="Arte selecionada" draggable={false} style={{...artTransform(zoom,panX,panY),width:'100%',height:'100%',display:'block',pointerEvents:'none',userSelect:'none'}}/>
  :<div className="art-editor-empty"><ImageOff/><span>Nenhuma imagem selecionada</span></div>}
 </div>
}
function CardCreatorScreen(){
 const g=useGame()
 const fileInputRef=React.useRef<HTMLInputElement>(null)
 const [draft,setDraft]=React.useState({nome:'Nova Carta',kind:'Herói' as DraftKind,raridade:'comum' as Rarity,ataque:0,defesa:0,vida:0,habilidade:'',imagem:''})
 const [zoom,setZoomRaw]=React.useState(1.2)
 const [panX,setPanX]=React.useState(0)
 const [panY,setPanY]=React.useState(0)
 const set=(patch:Partial<typeof draft>)=>setDraft(d=>({...d,...patch}))
 const setZoom=(z:number)=>{ const limit=maxPan(z); setZoomRaw(z); setPanX(p=>clamp(p,-limit,limit)); setPanY(p=>clamp(p,-limit,limit)) }
 const resetTransform=()=>{ setZoomRaw(1.2); setPanX(0); setPanY(0) }
 const onPickFile=(e:React.ChangeEvent<HTMLInputElement>)=>{
  const file=e.target.files?.[0]; if(!file)return
  const reader=new FileReader()
  reader.onload=()=>{ set({imagem:reader.result as string}); resetTransform() }
  reader.readAsDataURL(file)
  e.target.value=''
 }
 const [justSaved,setJustSaved]=React.useState(false)
 const artStyle=artTransform(zoom,panX,panY)
 const previewCard={nome:draft.nome||'Nova Carta',ataque:draft.ataque,defesa:draft.defesa,vida:draft.vida,habilidade:draft.habilidade||'Descreva a habilidade ou efeito da carta.',arte:draft.imagem,raridade:draft.raridade,boss:draft.kind==='Chefe',elite:draft.kind==='Elite'}
 const addToCollection=()=>{
  if(!draft.imagem)return
  g.addCustomCard({nome:draft.nome||'Nova Carta',kind:draft.kind,raridade:draft.raridade,ataque:draft.ataque,defesa:draft.defesa,vida:draft.vida,habilidade:draft.habilidade,imagem:draft.imagem,zoom,panX,panY})
  setJustSaved(true)
  setTimeout(()=>setJustSaved(false),2200)
 }
 return <div className="card-creator-page">
  <div className="card-creator-head">
   <button onClick={()=>g.setScreen('menu')}><ArrowLeft/>Menu</button>
   <div><span className="eyebrow">EM CONSTRUÇÃO</span><h1>Criador de cartas</h1><p>Primeira versão da ferramenta. As regras completas de criação ainda serão definidas — por enquanto, use os campos abaixo para montar e visualizar uma carta com a moldura oficial do jogo.</p></div>
  </div>
  <div className="card-creator-layout three-col">
   <Panel title="Informações da carta" className="card-creator-form">
    <label className="field">Nome<input value={draft.nome} onChange={e=>set({nome:e.target.value})}/></label>
    <label className="field">Tipo<select value={draft.kind} onChange={e=>set({kind:e.target.value as DraftKind})}>{creatorKinds.map(k=><option key={k} value={k}>{k}</option>)}</select></label>
    <label className="field">Raridade<select value={draft.raridade} onChange={e=>set({raridade:e.target.value as Rarity})}>{Object.entries(rarityLabel).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <div className="field-row">
     <label className="field">Ataque<input type="number" value={draft.ataque} onChange={e=>set({ataque:Number(e.target.value)||0})}/></label>
     <label className="field">Defesa<input type="number" value={draft.defesa} onChange={e=>set({defesa:Number(e.target.value)||0})}/></label>
     <label className="field">Vida<input type="number" value={draft.vida} onChange={e=>set({vida:Number(e.target.value)||0})}/></label>
    </div>
    <label className="field">Habilidade / efeito<textarea rows={3} value={draft.habilidade} onChange={e=>set({habilidade:e.target.value})}/></label>
   </Panel>
   <Panel title="Upload da imagem" className="card-creator-upload">
    <div className="art-upload-row">
     <button type="button" onClick={()=>fileInputRef.current?.click()}><Upload size={16}/>Escolher imagem do computador</button>
     {draft.imagem&&<button type="button" className="ghost-action" onClick={()=>{set({imagem:''});resetTransform()}}>Remover</button>}
    </div>
    <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={onPickFile}/>
    <ArtPositionEditor src={draft.imagem} zoom={zoom} panX={panX} panY={panY} onPan={(x,y)=>{setPanX(x);setPanY(y)}}/>
    {draft.imagem&&<>
     <div className="zoom-row"><ZoomIn size={16}/><input type="range" min={1} max={2.5} step={0.02} value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><button type="button" className="ghost-action" onClick={resetTransform}>Centralizar</button></div>
     <small className="field-hint">Arraste a imagem para posicionar o enquadramento e use o controle de zoom para ajustar.</small>
    </>}
   </Panel>
   <Panel title="Pré-visualização" className="card-creator-preview">
    <div className="card-creator-preview-inner">
     <CardFrame card={previewCard} kind={draft.kind} artStyle={draft.imagem?artStyle:undefined}/>
     <button type="button" className="primary" disabled={!draft.imagem} onClick={addToCollection}><Plus size={16}/>Adicionar à coleção</button>
     <small className="field-hint">{justSaved?'✓ Adicionada!':`${g.customCards.length} carta${g.customCards.length===1?'':'s'} na coleção`}</small>
    </div>
   </Panel>
  </div>
 </div>
}
function Empty({text}:{text:string}){return <div className="empty"><Package/><p>{text}</p></div>}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
