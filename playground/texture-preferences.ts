export interface TextureTagConfig {
  material: 'texture' | 'frosted'
  label: string
  background: string
  ink: string
  opacity: number
  scale: number
  angle: number
  radius: number
  blend: 'multiply' | 'soft-light' | 'normal'
  frostBlur: number
  frostContrast: number
  frostTint: number
  frostTintArea: 'background' | 'texture'
  frostOnTexture: boolean
}

export const defaultTextureFile = 'arab-tile.png'
export const textureDefaults: TextureTagConfig = {
  material: 'texture',
  label: '设计系统', background: '#e0e9d5', ink: '#26382b', opacity: 35,
  scale: 75, angle: 0, radius: 28, blend: 'multiply',
  frostBlur: 18, frostContrast: 100, frostTint: 12,
  frostTintArea: 'background', frostOnTexture: false,
}
export type PreviewBackground = 'pattern' | 'photo' | 'plain'
interface TexturePreferences { selectedFile: string; textures: Record<string, TextureTagConfig>; previewBackground: PreviewBackground }
const storageKey = 'apptify:texture-tags:v1'
const isTextureFile = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9-]+\.png$/.test(value)
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

function restoreConfig(value: unknown): TextureTagConfig {
  const config = { ...textureDefaults }
  if (!isRecord(value)) return config
  if (value.material === 'frosted') config.material = 'frosted'
  if (value.frostTintArea === 'texture') config.frostTintArea = 'texture'
  if (typeof value.frostOnTexture === 'boolean') config.frostOnTexture = value.frostOnTexture
  if (typeof value.label === 'string') config.label = value.label.slice(0, 32)
  for (const key of ['background', 'ink'] as const) {
    if (typeof value[key] === 'string' && /^#[a-f\d]{6}$/i.test(value[key])) config[key] = value[key]
  }
  for (const [key, min, max] of [['opacity', 0, 100], ['scale', 25, 200], ['angle', 0, 180], ['radius', 0, 28], ['frostBlur', 0, 32], ['frostContrast', 0, 200], ['frostTint', 0, 80]] as const) {
    const number = value[key]
    if (typeof number === 'number' && Number.isFinite(number)) config[key] = Math.max(min, Math.min(max, number))
  }
  if (value.blend === 'multiply' || value.blend === 'soft-light' || value.blend === 'normal') config.blend = value.blend
  return config
}

export function loadTexturePreferences(): TexturePreferences {
  const defaults: TexturePreferences = { selectedFile: defaultTextureFile, textures: {}, previewBackground: 'pattern' }
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
    if (!isRecord(stored)) return defaults
    return {
      selectedFile: isTextureFile(stored.selectedFile) ? stored.selectedFile : defaultTextureFile,
      previewBackground: stored.previewBackground === 'photo' || stored.previewBackground === 'plain' ? stored.previewBackground : 'pattern',
      textures: isRecord(stored.textures)
        ? Object.fromEntries(Object.entries(stored.textures).filter(([file]) => isTextureFile(file)).map(([file, value]) => [file, restoreConfig(value)]))
        : {},
    }
  } catch { return defaults }
}

export function saveTexturePreferences(preferences: TexturePreferences) {
  try { localStorage.setItem(storageKey, JSON.stringify(preferences)) } catch { /* Keep the in-memory settings when storage is unavailable. */ }
}
