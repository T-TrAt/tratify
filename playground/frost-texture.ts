/** Texture coverage: transparent background = 0, strongest visible mark = 1. */
export function textureCoverage(rgba: Uint8ClampedArray): Float32Array {
  const result = new Float32Array(rgba.length / 4)
  let weightedLight = 0, alphaSum = 0, opaque = true
  for (let i = 0; i < rgba.length; i += 4) {
    const alpha = rgba[i + 3] / 255
    weightedLight += (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255 * alpha
    alphaSum += alpha
    if (rgba[i + 3] < 255) opaque = false
  }
  const lightInk = !opaque && weightedLight / Math.max(alphaSum, 1e-8) > 0.5
  let min = Infinity, max = 0
  for (let i = 0; i < result.length; i++) {
    const offset = i * 4
    const light = (0.2126 * rgba[offset] + 0.7152 * rgba[offset + 1] + 0.0722 * rgba[offset + 2]) / 255
    const value = rgba[offset + 3] / 255 * (lightInk ? light : 1 - light)
    result[i] = value
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  // Uniform images have no pattern. Normalizing makes faint source PNGs usable.
  if (max - min < 1e-6) return result.fill(0)
  for (let i = 0; i < result.length; i++) result[i] = (result[i] - min) / (max - min)
  return result
}

export function frostMaskPixels(coverage: Float32Array, contrast: number, onTexture = false): Uint8ClampedArray {
  const result = new Uint8ClampedArray(coverage.length * 4)
  const strength = Math.max(0, Math.min(200, contrast)) / 100
  for (let i = 0; i < coverage.length; i++) {
    const offset = i * 4
    result[offset] = result[offset + 1] = result[offset + 2] = 255
    // Mask alpha reveals the layer; invert coverage to target texture marks instead of blank areas.
    const clearAmount = onTexture ? 1 - coverage[i] : coverage[i]
    result[offset + 3] = Math.round(255 * (1 - Math.min(1, clearAmount * strength)))
  }
  return result
}

const imageCoverage = new WeakMap<HTMLImageElement, Float32Array>()
export function createFrostMask(image: HTMLImageElement, contrast: number, onTexture = false): string {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || !canvas.width || !canvas.height) return ''
  let coverage = imageCoverage.get(image)
  if (!coverage) {
    context.drawImage(image, 0, 0)
    coverage = textureCoverage(context.getImageData(0, 0, canvas.width, canvas.height).data)
    imageCoverage.set(image, coverage)
  }
  const mask = context.createImageData(canvas.width, canvas.height)
  mask.data.set(frostMaskPixels(coverage, contrast, onTexture))
  context.putImageData(mask, 0, 0)
  return canvas.toDataURL('image/png')
}

/** The filter stays unrotated; only its repeating mask changes scale and angle. */
export function frostMaskPattern(mask: string, width: number, height: number, angle: number): string {
  if (!mask) return ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><defs><pattern id="texture" patternUnits="userSpaceOnUse" width="${width}" height="${height}" patternTransform="rotate(${angle})"><image href="${mask}" width="${width}" height="${height}"/></pattern></defs><rect width="100%" height="100%" fill="url(#texture)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
