import { describe, expect, it } from 'vitest'
import { frostMaskPixels, frostMaskPattern, textureCoverage } from '../playground/frost-texture'
import { loadTexturePreferences } from '../playground/texture-preferences'

describe('texture-driven frost mask', () => {
  it.each([0, 255])('recognizes faint %i ink and frosts empty areas more than texture marks', ink => {
    const coverage = textureCoverage(new Uint8ClampedArray([ink, ink, ink, 0, ink, ink, ink, 10, ink, ink, ink, 20]))
    expect([...coverage]).toEqual([0, 0.5, 1])
    const mask = frostMaskPixels(coverage, 100)
    expect([mask[3], mask[7], mask[11]]).toEqual([255, 128, 0])
    const reversed = frostMaskPixels(coverage, 100, true)
    expect([reversed[3], reversed[7], reversed[11]]).toEqual([0, 128, 255])
  })
  it('maps opaque grayscale by brightness, handles uniform images and bounds contrast', () => {
    const coverage = textureCoverage(new Uint8ClampedArray([0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255]))
    expect(coverage[0]).toBe(1)
    expect(coverage[2]).toBe(0)
    expect(frostMaskPixels(coverage, 0).filter((_, i) => i % 4 === 3)).toEqual(new Uint8ClampedArray([255, 255, 255]))
    expect(frostMaskPixels(coverage, 0, true).filter((_, i) => i % 4 === 3)).toEqual(new Uint8ClampedArray([255, 255, 255]))
    expect(frostMaskPixels(new Float32Array([0, 0.5, 1]), 300).filter((_, i) => i % 4 === 3)).toEqual(new Uint8ClampedArray([255, 0, 0]))
    expect([...textureCoverage(new Uint8ClampedArray([0, 0, 0, 20, 0, 0, 0, 20]))]).toEqual([0, 0])
  })
  it('exports a self-contained mask with independent scale and rotation', () => {
    const svg = decodeURIComponent(frostMaskPattern('data:image/png;base64,abc', 82.5, 75, 35))
    expect(svg).toContain('width="82.5" height="75" patternTransform="rotate(35)"')
    expect(svg).toContain('href="data:image/png;base64,abc"')
    expect(frostMaskPattern('', 10, 10, 0)).toBe('')
  })
  it('restores older texture settings and validates new frost parameters', () => {
    localStorage.setItem('apptify:texture-tags:v1', JSON.stringify({ selectedFile: 'arab-tile.png', textures: {
      'arab-tile.png': { scale: 125 },
      'batthern.png': { material: 'frosted', frostBlur: 99, frostTint: -1, frostContrast: 150, frostTintArea: 'texture', frostOnTexture: true },
    }, previewBackground: 'photo' }))
    const saved = loadTexturePreferences()
    expect(saved.textures['arab-tile.png']).toMatchObject({ material: 'texture', scale: 125, frostBlur: 18, frostTintArea: 'background', frostOnTexture: false })
    expect(saved.textures['batthern.png']).toMatchObject({ material: 'frosted', frostBlur: 32, frostTint: 0, frostContrast: 150, frostTintArea: 'texture', frostOnTexture: true })
    expect(saved.previewBackground).toBe('photo')
    localStorage.clear()
  })
})
