import React from 'react'
import { Backpack, ShieldCheck, X } from 'lucide-react'
import { HEROES, equipmentBagCapacity, equipmentByRef, equipmentInstanceBreakdown, equipmentWeaponClass, useGame } from '../store/game'
import type { Equipment, Slot } from '../types'
import { offenseLabel } from '../data/heroStatProfiles'
import { compareDrop, signed } from './dropCompare'
import { HERO_SELECT_ART } from './heroProfiles'

export interface PaperdollModernProps {
  assetUrl: (path: string) => string
  /** Endereço da arte de um equipamento (antes de assetUrl). */
  art: (item: Equipment) => string
  slotNames: Record<Slot, string>
  /** Espaço escolhido, quando quem usa quer controlar (o cabeçalho da tela leva direto a uma melhoria). */
  selectedSlot?: Slot
  onSelectSlot?: (slot: Slot) => void
}

// Os dois anéis formam um grupo só: o jogo põe o anel novo no espaço livre.
const slotGroup = (slot: Slot): Slot => (slot === 'anel_2' ? 'anel_1' : slot)

const LEFT: Slot[] = ['capacete', 'peitoral', 'calcas', 'botas', 'bolsa']
const RIGHT: Slot[] = ['amuleto', 'anel_1', 'anel_2', 'mao_direita', 'mao_esquerda']

// "Boneco de equipamento" do modo Moderno: o herói no centro com os 10 espaços ao redor. Escolher um espaço
// mostra o que está nele e as peças da mochila que servem ali, cada uma comparada com o que o herói veste.
export function PaperdollModern({ assetUrl, art, slotNames, selectedSlot, onSelectSlot }: PaperdollModernProps) {
  const g = useGame()
  const [ownSlot, setOwnSlot] = React.useState<Slot>('mao_direita')
  const slot = selectedSlot ?? ownSlot
  const setSlot = (next: Slot) => {
    setOwnSlot(next)
    onSelectSlot?.(next)
  }
  const hero = HEROES.find((h) => h.id === g.heroId)
  const bagFull = g.equipmentBag.length >= equipmentBagCapacity(g)
  const dualWielding = equipmentWeaponClass(equipmentByRef(g.equipped.mao_direita)) === 'facas'

  const equippedItem = equipmentByRef(g.equipped[slot])
  const equippedTotal = equippedItem ? equipmentInstanceBreakdown(equippedItem, g.equipped[slot], g).total : undefined
  const candidates = g.equipmentBag
    .map((ref) => ({ ref, item: equipmentByRef(ref) }))
    .filter((c): c is { ref: string; item: Equipment } => Boolean(c.item) && slotGroup(c.item!.slot) === slotGroup(slot))
    .map((c) => ({ ...c, cmp: compareDrop(c.ref, g) }))

  const renderSlot = (s: Slot) => {
    const item = equipmentByRef(g.equipped[s])
    const locked = s === 'mao_esquerda' && dualWielding
    return (
      <button
        key={s}
        className={`pd-slot${slot === s ? ' selected' : ''}${item ? ' filled' : ''}${item ? ` r-${item.raridade ?? 'comum'}` : ''}`}
        aria-pressed={slot === s}
        aria-label={`${slotNames[s]}: ${item ? item.nome : locked ? 'ocupada pelas facas' : 'vazio'}`}
        onClick={() => setSlot(s)}
      >
        {item ? <img src={assetUrl(art(item))} alt="" loading="lazy" decoding="async" /> : <span className="pd-empty" aria-hidden />}
        <small>{slotNames[s]}</small>
      </button>
    )
  }

  return (
    <section className="panel pd-panel">
      <h2 className="panel-title">Equipamento</h2>
      <div className="pd-stage">
        <div className="pd-col">{LEFT.map(renderSlot)}</div>
        <figure className="pd-figure">
          {hero && <img src={assetUrl(HERO_SELECT_ART(hero.id).figure)} alt={hero.nome} />}
        </figure>
        <div className="pd-col">{RIGHT.map(renderSlot)}</div>
      </div>

      <div className="pd-detail" aria-live="polite">
        <header>
          <div>
            <small>{slotNames[slot]}</small>
            <strong>{equippedItem ? equippedItem.nome : slot === 'mao_esquerda' && dualWielding ? 'Ocupada pelas facas' : 'Vazio'}</strong>
            {equippedItem && (
              <span className="pd-stats">
                {equippedItem.slot === 'bolsa' ? `Capacidade ${equippedItem.capacidade ?? 8}` : `${offenseLabel(g.heroId)} +${equippedTotal?.atk ?? 0} · Armadura +${equippedTotal?.def ?? 0} · Vida +${equippedTotal?.life ?? 0}`}
              </span>
            )}
          </div>
          {equippedItem && slot !== 'bolsa' && (
            <button className="pd-unequip" disabled={bagFull} title={bagFull ? 'Mochila cheia: libere espaço antes de retirar a peça.' : undefined} onClick={() => g.unequip(slot)}>
              <X size={15} aria-hidden />
              {bagFull ? 'Mochila cheia' : 'Retirar'}
            </button>
          )}
        </header>

        <h3>
          <Backpack size={16} aria-hidden />
          Da mochila para {slotNames[slot].toLowerCase()}
          <small>{candidates.length}</small>
        </h3>
        {candidates.length ? (
          <ul className="pd-candidates">
            {candidates.map(({ ref, item, cmp }) => (
              <li key={ref}>
                <img src={assetUrl(art(item))} alt="" loading="lazy" decoding="async" />
                <div className="pd-cand-copy">
                  <strong>{item.nome}</strong>
                  <small>
                    {item.raridade ?? 'comum'}
                    {cmp && cmp.slot !== slot && slotGroup(slot) === 'anel_1' ? ` · entra no ${slotNames[cmp.slot]}` : ''}
                  </small>
                  {cmp && (
                    <ul className="pd-rows" aria-label="Comparação com o que você veste">
                      {cmp.rows.map((row) => (
                        <li key={row.id} className={row.delta > 0 ? 'up' : row.delta < 0 ? 'down' : ''}>
                          <span>{row.label}</span>
                          <b>
                            {row.from} → {row.to}
                          </b>
                          <em>{signed(row.delta)}</em>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button className="pd-equip" disabled={!cmp || !cmp.block.ok} title={cmp && !cmp.block.ok ? cmp.block.reason : undefined} onClick={() => g.equip(ref)}>
                  <ShieldCheck size={16} aria-hidden />
                  {!cmp ? 'Indisponível' : cmp.block.ok ? 'Equipar' : cmp.block.label}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pd-none">Nenhuma peça na mochila serve neste espaço.</p>
        )}
      </div>
    </section>
  )
}

