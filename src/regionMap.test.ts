import { describe, expect, it } from 'vitest'
import { REGION_MAPS, validateRegionMap } from './regionMap'

describe('mapas de região', () => {
  it('mantém spawn, pins e rotas de todos os mapas navegáveis', () => {
    for (const map of Object.values(REGION_MAPS)) {
      expect(validateRegionMap(map), map.id).toEqual([])
    }
  })
})
