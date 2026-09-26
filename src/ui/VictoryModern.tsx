import React from 'react'
import { Coins, HeartPulse, ShieldCheck, Skull, Sparkles, Star, Trophy, Users } from 'lucide-react'
import type { CoopShareRow } from '../online/coopMath'
import { equipmentByRef, levelInfo, maxHp, useGame } from '../store/game'
import { bossPreparation } from './bossData'
import { xpProgress } from './campData'
import { compareDrop, findDroppedRef, signed } from './dropCompare'

export interface VictoryLoot {
  gold: number
  xp: number
  title: string
  equipmentId?: string
  itemId?: string
  leveledUp?: boolean
  newLevel?: number
  levelsGained?: number
}

export interface VictoryModernProps {
  loot?: VictoryLoot
  defeat: boolean
  /** Título especial (chefe, masmorra): ganha o destaque dourado. */
  epic: boolean
  /** Rótulo do próximo passo ("Mapa", "Sala 3"). */
  nextStep: string
  /** Carta do equipamento/consumível, já desenhada pela tela (ItemCard). */
  equipmentCard?: React.ReactNode
  itemCard?: React.ReactNode
  /** Número que sobe animado (o mesmo do modo Clássico). */
  animated: (value: number) => React.ReactNode
  /** Só no coop: como o grupo dividiu a recompensa (mesmo rateio que paga ouro e XP). */
  group?: { rows: CoopShareRow[]; me: string; classLabel: (heroId?: string) => string }
  /** Avisos e ações que a tela já monta (masmorra, bolsa cheia, botões). */
  children?: React.ReactNode
  /** Cena do capítulo atual (URL já resolvida) para o cabeçalho, na linguagem do Acampamento. Decorativa. */
  scene?: string
}

// Cabeçalho da tela de Vitória no modo Moderno: recompensas, saque com comparação e "Equipar agora", e
// recuperação. A preparação e a mochila continuam logo abaixo, as mesmas do modo Clássico.
export function VictoryModern({ loot, defeat, epic, nextStep, equipmentCard, itemCard, animated, group, children, scene }: VictoryModernProps) {
  const [sceneFailed, setSceneFailed] = React.useState(false)
  const g = useGame()
  const [equipped, setEquipped] = React.useState<string | undefined>()
  // Ao abrir, começa no topo mesmo que a tela anterior estivesse rolada.
  React.useEffect(() => {
    if (typeof window.scrollTo === 'function') window.scrollTo(0, 0)
  }, [])
  const xp = xpProgress(g.xp)
  const top = maxHp(g)
  const prep = bossPreparation(g, top)
  const ref = !defeat && loot?.equipmentId ? findDroppedRef(g.equipmentBag, loot.equipmentId) : undefined
  const drop = ref ? equipmentByRef(ref) : undefined
  const cmp = ref ? compareDrop(ref, g) : undefined

  const equip = () => {
    if (!ref || !drop) return
    g.equip(ref)
    setEquipped(drop.nome)
  }

  return (
    <section className={`vc-page${defeat ? ' is-defeat' : ''}`}>
      <header className="vc-hero">
        {scene && !sceneFailed && <img className="vc-scene" src={scene} alt="" aria-hidden="true" decoding="async" onError={() => setSceneFailed(true)} />}
        {defeat ? <Skull size={44} aria-hidden /> : <Trophy size={44} className={epic ? 'epic' : ''} aria-hidden />}
        <div>
          <small>Resultado da batalha</small>
          <h1>{loot?.title ?? 'Vitória'}</h1>
        </div>
      </header>

      {loot?.leveledUp && (
        <div className="vc-levelup" role="status">
          <Sparkles size={22} aria-hidden />
          <span>
            <b>Você alcançou o nível {loot.newLevel}!</b>
            {(loot.levelsGained ?? 0) > 1 ? ` (+${loot.levelsGained} níveis de uma vez)` : ''}
            <small>Novos pontos de atributo disponíveis na Ficha.</small>
          </span>
        </div>
      )}

      <div className="vc-grid">
        <aside className="vc-card vc-rewards" aria-label="Recompensas">
          <h2>Recompensas</h2>
          <dl>
            <div>
              <dt>
                <Star size={16} aria-hidden />
                XP
              </dt>
              <dd className="xp">+{animated(loot?.xp ?? 0)}</dd>
            </div>
            <div>
              <dt>
                <Coins size={16} aria-hidden />
                Ouro
              </dt>
              <dd className="gold">+{animated(loot?.gold ?? 0)}</dd>
            </div>
          </dl>
          <div className="vc-xp" role="img" aria-label={`Nível ${levelInfo(g.xp).lvl}: ${Math.floor(xp.pct)}% para o próximo`}>
            <span>
              Nível {xp.level}
              <small>
                {xp.progress}/{xp.next} XP
              </small>
            </span>
            <i>
              <b style={{ width: `${xp.pct}%` }} />
            </i>
          </div>
          <p className="vc-next">
            <small>Próximo passo</small>
            <strong>{nextStep}</strong>
          </p>
        </aside>

        <section className="vc-card vc-drop" aria-label="Saque">
          <h2>Saque</h2>
          {drop && (
            <div className="vc-drop-body">
              <div className="vc-drop-card">{equipmentCard}</div>
              {cmp && (
                <div className="vc-compare">
                  <h3>
                    Comparar
                    <small>{cmp.replaces ? `no lugar de ${cmp.replaces}` : 'espaço livre'}</small>
                  </h3>
                  <table>
                    <tbody>
                      {cmp.rows.map((row) => (
                        <tr key={row.id} className={row.delta > 0 ? 'up' : row.delta < 0 ? 'down' : ''}>
                          <th scope="row">{row.label}</th>
                          <td>
                            {row.from} → {row.to}
                          </td>
                          <td className="delta">{signed(row.delta)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className={`vc-verdict v-${cmp.verdict}`}>
                    {{ better: 'Melhor que o atual.', worse: 'Pior que o atual.', mixed: 'Ganha em uns, perde em outros.', same: 'Sem diferença nos números.' }[cmp.verdict]}
                  </p>
                  <button className="vc-equip" disabled={!cmp.block.ok} title={cmp.block.ok ? undefined : cmp.block.reason} onClick={equip}>
                    <ShieldCheck size={17} aria-hidden />
                    {cmp.block.ok ? 'Equipar agora' : cmp.block.label}
                  </button>
                </div>
              )}
            </div>
          )}
          {!drop && equipped && (
            <p className="vc-equipped" role="status">
              <ShieldCheck size={18} aria-hidden />
              {equipped} equipado.
            </p>
          )}
          {!drop && !equipped && itemCard}
          {!drop && !equipped && !itemCard && <p className="vc-empty">{defeat ? 'Sem saque nesta batalha.' : 'Nenhum item adicional foi encontrado.'}</p>}
        </section>

        <aside className="vc-card vc-recover" aria-label="Recuperação">
          <h2>Recuperação</h2>
          <div className="vc-hp" role="img" aria-label={`Vida ${g.hp} de ${top}`}>
            <span>
              <HeartPulse size={16} aria-hidden />
              Vida
              <b>
                {g.hp}/{top}
              </b>
            </span>
            <i>
              <b style={{ width: `${top > 0 ? Math.max(0, Math.min(100, (g.hp / top) * 100)) : 0}%` }} />
            </i>
          </div>
          <ul>
            <li>
              Poções de cura <b>{prep.healingPotions}</b>
            </li>
            <li>
              Outros consumíveis <b>{prep.otherConsumables}</b>
            </li>
          </ul>
          <p className="vc-hint">Use as poções na preparação logo abaixo antes da próxima luta.</p>
        </aside>
      </div>

      {group && group.rows.length > 0 && (
        <section className="vc-card vc-group" aria-label="Grupo">
          <h2>
            <Users size={15} aria-hidden />
            Grupo
            <small>divisão da recompensa</small>
          </h2>
          <ul>
            {group.rows.map((row) => (
              <li key={row.userId} className={row.userId === group.me ? 'me' : ''}>
                <div className="vc-group-who">
                  <strong>
                    {row.name}
                    {row.userId === group.me && <em>você</em>}
                  </strong>
                  <small>{group.classLabel(row.heroId)}</small>
                </div>
                <div className="vc-group-parts">
                  <span title="Dano causado">Dano {row.damage}</span>
                  <span title="Cura feita">Cura {row.healing}</span>
                  <span title="Dano que você evitou levar">Evitado {row.resisted}</span>
                </div>
                <div className="vc-group-share" role="img" aria-label={`${Math.round(row.share * 100)}% da recompensa`}>
                  <i>
                    <b style={{ width: `${Math.round(row.share * 100)}%` }} />
                  </i>
                  <span>{Math.round(row.share * 100)}%</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="vc-hint">Ouro e XP são divididos pelo que cada um fez: dano, cura e dano evitado.</p>
        </section>
      )}

      {children}
    </section>
  )
}
