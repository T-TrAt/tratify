import { onBeforeUnmount, onMounted, readonly, ref } from 'vue'
import options from './themes.json'

export const materialThemeOptions = options
export const defaultMaterialTheme = 'baseline'
const storageKey = 'apptify:material-theme:v1'
const isTheme = (value: unknown): value is string => typeof value === 'string' && options.some(option => option.name === value)

function readStoredTheme(): string | undefined {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null')
    return value && typeof value === 'object' && 'name' in value && isTheme(value.name) ? value.name : defaultMaterialTheme
  } catch { return undefined }
}

const name = ref(readStoredTheme() ?? defaultMaterialTheme)

export function setMaterialTheme(value: string) {
  if (!isTheme(value)) return
  name.value = value
  try { window.localStorage.setItem(storageKey, JSON.stringify({ name: value })) } catch { /* Keep the current selection when storage is unavailable. */ }
}

export function resetMaterialTheme() { setMaterialTheme(defaultMaterialTheme) }

export function useMaterialTheme() {
  const restore = () => { name.value = readStoredTheme() ?? name.value }
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) restore()
  }
  onMounted(() => {
    restore()
    window.addEventListener('storage', onStorage)
  })
  onBeforeUnmount(() => window.removeEventListener('storage', onStorage))
  return { name: readonly(name), set: setMaterialTheme, reset: resetMaterialTheme }
}
