// Peças de interface da Bíblia de narrativa (docs/PLANO_MESTRE_NARRATIVA_MUNDO.md): o eco dos itens
// e a teia social no diálogo do NPC, a fala de conclusão depois da entrega, a escolha final da
// campanha e, no Diário de Missões, o arco dos 7 atos, os títulos da jornada e o epílogo.
import React from 'react'
import { CheckCircle2, Crown, Link2, Lock, Map, Sparkles, Trophy } from 'lucide-react'
import { CONSUMABLES, EQUIPMENT, TERRITORIES, campaignEnding, equipmentBaseId, storyLoreTitles, useGame } from '../store/game'
import { npcById, type NpcDefinition } from '../data/npcs'
import { STORY_QUESTS, type StoryQuest } from '../data/storyQuests'
import {
  CAMPAIGN_ENDINGS, NPC_LORE, STORY_ACTS, itemEchoesFor, npcTrustEarned, npcsWhoRecognize, storyAct,
  type CampaignEnding, type CampaignEndingId,
} from '../data/worldLore'

const regionOf = (npcId: string) => npcById(npcId)?.regionId
const regionName = (regionId?: string) => TERRITORIES.find(t => t.id === regionId)?.nome ?? regionId ?? ''

export function actLabel(act: number) {
  const info = storyAct(act)
  return info ? `Ato ${act} • ${info.title}` : `Ato ${act}`
}

/** Eco dos itens equipados + laços e motivação oculta do NPC. */
export function NpcWorldEcho({ npc, assetUrl }: { npc: NpcDefinition; assetUrl: (path: string) => string }) {
  const equipped = useGame(state => state.equipped)
  const completed = useGame(state => state.completedStoryQuests) ?? []
  const equippedIds = (Object.values(equipped) as (string | undefined)[]).filter((ref): ref is string => Boolean(ref)).map(ref => equipmentBaseId(ref))
  const echoes = itemEchoesFor(npc.id, equippedIds)
  const lore = NPC_LORE[npc.id]
  const trusted = npcTrustEarned(npc.id, STORY_QUESTS, completed, regionOf)

  return <>
    {echoes.map(echo => {
      const item = EQUIPMENT.find(e => e.id === echo.itemId)
      return <aside key={echo.itemId} className="lore-echo">
        <span className="lore-echo-badge"><Sparkles size={12} />RECONHECE SEU EQUIPAMENTO • {item?.nome}</span>
        <p>“{echo.fala}”</p>
      </aside>
    })}
    {lore && <details className="lore-ties">
      <summary><Link2 size={14} />Laços e segredos de {npc.nome}</summary>
      <ul className="lore-ties-list">
        {lore.lacos.map(link => {
          const other = npcById(link.npcId)
          if (!other) return null
          return <li key={link.npcId}>
            <img src={assetUrl(other.portrait ?? other.sprite)} alt="" />
            <div><strong>{other.nome}</strong><small>{regionName(other.regionId)}</small><span>{link.relacao}</span></div>
          </li>
        })}
      </ul>
      <div className={`lore-motive${trusted ? '' : ' locked'}`}>
        <small>MOTIVAÇÃO OCULTA</small>
        {trusted
          ? <p>{lore.motivacao}</p>
          : <p><Lock size={13} />Conclua uma missão de história que passe por este personagem para descobrir o que o move.</p>}
      </div>
    </details>}
  </>
}

/** Fala de conclusão do NPC logo depois da entrega (e o epílogo, se foi a escolha final). */
export function QuestCompletionCard({ quest, ending, onDismiss }: { quest: StoryQuest; ending?: CampaignEnding; onDismiss: () => void }) {
  const reward = quest.reward.itemReward ? CONSUMABLES.find(c => c.id === quest.reward.itemReward) : undefined
  return <div className={`npc-quest-card lore-completion${ending ? ' ending' : ''}`}>
    <div className="npc-quest-badge"><CheckCircle2 size={12} /> MISSÃO CONCLUÍDA</div>
    <h3 className="npc-quest-title">{quest.title}</h3>
    <p className="npc-quest-speech">“{quest.dialogue.completion}”</p>
    {ending && <div className="lore-epilogue">
      <small><Crown size={13} />{ending.title}</small>
      <p>{ending.epilogue}</p>
    </div>}
    <div className="npc-quest-reward-preview">
      <small>RECEBIDO:</small>
      <span>
        +{quest.reward.gold} Ouro • +{quest.reward.xp} XP
        {reward ? ` • ${reward.nome}` : ''}
        {quest.reward.loreTitle ? ` • Título: ${quest.reward.loreTitle}` : ''}
        {ending ? ` • Título: ${ending.loreTitle}` : ''}
      </span>
    </div>
    <button className="lore-dismiss" onClick={onDismiss}>Continuar</button>
  </div>
}

/** A entrega da missão final: três caminhos, um só pode ser escolhido. */
export function EndingChoicePanel({ onChoose }: { onChoose: (id: CampaignEndingId) => void }) {
  return <div className="lore-ending-choices" role="group" aria-label="Escolha final da campanha">
    <p className="lore-ending-warning">Esta é a escolha final da campanha. Ela não pode ser desfeita, e os personagens dos dois mundos vão se lembrar dela.</p>
    {CAMPAIGN_ENDINGS.map(ending => <button key={ending.id} className={`lore-ending-option ending-${ending.id}`} onClick={() => {
      if (window.confirm(`${ending.title}\n\n${ending.choice}.\n\nConfirmar a escolha final? Ela não pode ser desfeita.`)) onChoose(ending.id)
    }}>
      <strong>{ending.choice}</strong>
      <small>{ending.title}</small>
      <span>{ending.summary}</span>
    </button>)}
  </div>
}

/** Os 7 atos da campanha, com o andamento de cada um. */
export function StoryActsOverview() {
  const completed = useGame(state => state.completedStoryQuests) ?? []
  const active = useGame(state => state.activeStoryQuests) ?? {}
  return <section className="lore-acts" aria-label="Os sete atos da campanha">
    <div className="story-journal-head"><Map size={16} /><strong>ARCO DA CAMPANHA</strong></div>
    <ol>
      {STORY_ACTS.map(act => {
        const quests = STORY_QUESTS.filter(q => q.act === act.act)
        const done = quests.filter(q => completed.includes(q.id)).length
        const status = quests.length > 0 && done === quests.length ? 'done' : done > 0 || quests.some(q => active[q.id]) ? 'current' : 'locked'
        return <li key={act.act} className={`lore-act ${status}`}>
          <span className="lore-act-number">{status === 'done' ? <CheckCircle2 size={14} /> : act.act}</span>
          <div>
            <strong>{act.title}</strong>
            <small>{act.route} • Níveis {act.levels[0]}–{act.levels[1]} • {done}/{quests.length} missões</small>
            {status !== 'locked' && <p>{act.stakes}</p>}
          </div>
        </li>
      })}
    </ol>
  </section>
}

/** Títulos de lore conquistados em missões, que podem ser exibidos na Ficha. */
export function JourneyTitlesPanel() {
  const g = useGame()
  const titles = storyLoreTitles(g)
  if (!titles.length) return null
  return <section className="lore-titles" aria-label="Títulos da jornada">
    <div className="story-journal-head"><Trophy size={16} /><strong>TÍTULOS DA JORNADA ({titles.length})</strong></div>
    <p className="muted">Conquistados nas missões de história. O título escolhido aparece ao lado do nome do herói na Ficha.</p>
    <div className="lore-titles-list">
      {titles.map(title => {
        const inUse = g.selectedTitle === title
        return <button key={title} className={inUse ? 'selected' : ''} aria-pressed={inUse} onClick={() => g.setSelectedTitle(inUse ? undefined : title)}>
          {title}<small>{inUse ? 'Em uso' : 'Usar'}</small>
        </button>
      })}
    </div>
  </section>
}

/** O epílogo da campanha, depois da escolha final. */
export function CampaignEndingCard() {
  const flags = useGame(state => state.storyFlags)
  const ending = campaignEnding({ storyFlags: flags })
  if (!ending) return null
  return <section className={`lore-ending-card ending-${ending.id}`}>
    <small><Crown size={14} />DESFECHO DA CAMPANHA</small>
    <h3>{ending.title}</h3>
    <p>{ending.epilogue}</p>
    <span>Os personagens dos dois mundos agora falam desse desfecho quando você os visita.</span>
  </section>
}

/** Quem, no mundo, reconhece esta peça (camada 3 do item mnemônico). */
export function itemRecognizedBy(itemId: string): NpcDefinition[] {
  return npcsWhoRecognize(itemId).map(id => npcById(id)).filter((npc): npc is NpcDefinition => Boolean(npc))
}
