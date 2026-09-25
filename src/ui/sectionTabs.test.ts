import { describe, expect, it } from 'vitest'
import { nextTabId } from './SectionTabs'

const ids = ['a', 'b', 'c']

describe('navegação das abas por teclado', () => {
  it('setas avançam e voltam dando a volta', () => {
    expect(nextTabId(ids, 'a', 'ArrowRight')).toBe('b')
    expect(nextTabId(ids, 'c', 'ArrowRight')).toBe('a')
    expect(nextTabId(ids, 'a', 'ArrowLeft')).toBe('c')
    expect(nextTabId(ids, 'b', 'ArrowDown')).toBe('c')
    expect(nextTabId(ids, 'b', 'ArrowUp')).toBe('a')
  })

  it('Home e End vão aos extremos', () => {
    expect(nextTabId(ids, 'b', 'Home')).toBe('a')
    expect(nextTabId(ids, 'b', 'End')).toBe('c')
  })

  it('outras teclas não mudam nada, e lista vazia devolve a atual', () => {
    expect(nextTabId(ids, 'b', 'Enter')).toBe('b')
    expect(nextTabId([], 'x', 'ArrowRight')).toBe('x')
  })

  it('id atual que não existe mais recomeça do início', () => {
    expect(nextTabId(ids, 'zzz', 'ArrowRight')).toBe('b')
  })
})
