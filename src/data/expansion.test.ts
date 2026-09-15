import { describe, expect, it } from 'vitest'
import { SUBREGION_THEME_MATERIALS, subregionThemeMaterial, SUBREGION_EQUIPMENT_KEYWORDS, subregionEquipmentKeyword, REGION_MATERIALS } from './expansion'

describe('subregionThemeMaterial (Contrato 16)', () => {
  it('resolve um material temático quando o temaLoot cita uma palavra-chave reconhecida', () => {
    expect(subregionThemeMaterial('Couro, poções e armas simples')?.id).toBe('couro_curtido')
    expect(subregionThemeMaterial('Machados, martelos e itens cerimoniais')?.id).toBe('aco_forjado')
    expect(subregionThemeMaterial('Runas e itens arcanos')?.id).toBe('esquirla_runica')
    expect(subregionThemeMaterial('Núcleos arcanos e ligas raras')?.id).toBe('engrenagem_solta')
  })
  it('devolve undefined quando nada bate (sem fallback genérico)', () => {
    expect(subregionThemeMaterial('Tesouros lendários e artefatos')).toBeUndefined()
    expect(subregionThemeMaterial(undefined)).toBeUndefined()
  })
  it('usa a ordem da lista como prioridade quando várias palavras-chave aparecem juntas', () => {
    // "Machados, martelos, runas e armadura pesada" cita tanto machado/martelo quanto runa --
    // machado/martelo vem antes na lista, então ganha.
    expect(subregionThemeMaterial('Machados, martelos, runas e armadura pesada')?.id).toBe('aco_forjado')
  })
  it('todo material tem id único e não colide com nenhum REGION_MATERIALS existente', () => {
    const ids = SUBREGION_THEME_MATERIALS.map(m => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    const regionIds = new Set(Object.values(REGION_MATERIALS).map(m => m.id))
    for (const id of ids) expect(regionIds.has(id), id).toBe(false)
  })
})

describe('subregionEquipmentKeyword (Contrato 16)', () => {
  it('resolve um padrão de item quando o temaLoot cita um tipo de arma/armadura conhecido', () => {
    expect(subregionEquipmentKeyword('Machados, martelos e itens cerimoniais')?.test('Machado Cinzento')).toBe(true)
    expect(subregionEquipmentKeyword('Escudos rúnicos e armas anãs')?.test('Escudo de Carvalho')).toBe(true)
  })
  it('devolve undefined quando o temaLoot não cita nenhum tipo reconhecido', () => {
    expect(subregionEquipmentKeyword('Tesouros míticos, equipamentos finais e artefatos únicos')).toBeUndefined()
  })
  it('todo padrão de tema é único (sem dois grupos competindo pela mesma palavra-chave)', () => {
    const themes = SUBREGION_EQUIPMENT_KEYWORDS.map(k => k.theme.source)
    expect(new Set(themes).size).toBe(themes.length)
  })
})
