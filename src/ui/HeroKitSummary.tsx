import React from 'react'
import { Heart, Info, ShieldHalf, Sparkles, Zap } from 'lucide-react'
import { DIFFICULTY_LABEL, heroProfile } from './heroProfiles'
import { formatNumber, type ChampionCardData } from './championCardData'

export interface HeroKitSummaryProps {
  data: ChampionCardData
  /** Abre o diálogo de detalhes (texto completo, fórmulas). Sem ele o botão não aparece. */
  onOpenDetails?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

// Resumo do kit inicial de uma classe para a seleção clássica: função, dificuldade, os quatro atributos em
// números, Vida/Energia/Armadura do kit, habilidade-assinatura com até três etiquetas. O texto completo, a lore e as
// fórmulas ficam no diálogo de detalhes (mesmo dado da Carta de Campeão).
export function HeroKitSummary({ data, onOpenDetails }: HeroKitSummaryProps) {
  const profile = heroProfile(data.heroId)
  return (
    <div className="hks">
      <p className="hks-line">
        <span className="hks-role">{data.funcao}</span>
        <span className="hks-diff">Dificuldade: {DIFFICULTY_LABEL[profile.difficulty]}</span>
        {profile.beginner && (
          <span className="hks-beginner">
            <Sparkles size={12} aria-hidden /> Boa para começar
          </span>
        )}
      </p>
      <ul className="hks-attrs" aria-label="Atributos iniciais">
        {data.atributos.map((attr) => (
          <li key={attr.key} title={attr.dica}>
            <small>{attr.label}</small>
            <strong>{formatNumber(attr.valor + attr.bonus)}</strong>
          </li>
        ))}
      </ul>
      <ul className="hks-res" aria-label="Recursos do kit inicial">
        <li>
          <Heart size={13} aria-hidden />
          <small>Vida</small>
          <strong>{formatNumber(data.vida.max)}</strong>
        </li>
        <li>
          <Zap size={13} aria-hidden />
          <small>Energia</small>
          <strong>{formatNumber(data.energia.max)}</strong>
        </li>
        <li>
          <ShieldHalf size={13} aria-hidden />
          <small>Armadura</small>
          <strong>{formatNumber(data.armadura.valor)}</strong>
        </li>
      </ul>
      <section className="hks-sig" aria-label={`Habilidade assinatura: ${data.habilidade.nome}`}>
        <strong title={data.habilidade.nome}>{data.habilidade.nome}</strong>
        <ul className="cc-tags" aria-label="Etiquetas da habilidade">
          {data.habilidade.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </section>
      {onOpenDetails && (
        <button type="button" className="hks-details" aria-haspopup="dialog" aria-label={`Ver detalhes de ${data.classe}: habilidade, fórmulas e história`} onClick={onOpenDetails}>
          <Info size={15} aria-hidden /> Ver detalhes
        </button>
      )}
    </div>
  )
}
