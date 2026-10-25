<template>
  <apple-card class="texture-workshop" aria-label="纹理标签调试">
    <template v-if="activeTexture">
      <div class="workshop-layout">
        <section class="texture-preview" aria-label="纹理标签预览">
          <header class="preview-heading"><span>实时预览</span><span>{{ textures.length }} 款纹理</span></header>
          <apple-segmented-control v-model="previewBackground" class="background-options" label="预览背景" :items="backgroundOptions" />
          <div class="preview-stage" :data-background="previewBackground" :style="previewStyle">
            <div class="hero-tag">
              <TextureTag v-if="visible" v-bind="tagProps" size="large" :label="config.label || '标签'" closable @close="visible = false" />
              <apple-link v-else as="button" :icon="Plus" @click="visible = true">重新添加标签</apple-link>
            </div>
            <div v-if="config.material === 'frosted'" class="preview-sizes frost-comparison" aria-label="磨砂对比">
              <TextureTag v-bind="tagProps" label="透明对照" :frost-blur="0" :frost-tint="0" frost-mask="" />
              <TextureTag v-bind="tagProps" label="均匀磨砂" frost-mask="" frost-tint-mask="" />
              <TextureTag v-bind="tagProps" label="纹理磨砂" />
            </div>
            <div v-else class="preview-sizes">
              <TextureTag v-bind="tagProps" size="small" label="灵感收藏" />
              <TextureTag v-bind="tagProps" label="进行中" />
              <TextureTag v-bind="tagProps" label="待确认" disabled />
            </div>
          </div>
          <footer class="texture-credit">
            <div><apple-link :href="activeTexture.sourceUrl" external>{{ activeTexture.title }}</apple-link><span>{{ activeTexture.author === 'Unknown' ? '作者未知' : activeTexture.author }}</span></div>
            <apple-link :href="activeTexture.licenseUrl" external>CC BY 3.0</apple-link>
          </footer>
        </section>
        <section class="texture-controls" aria-label="纹理参数">
          <header class="controls-heading"><h2>参数</h2><apple-link as="button" :icon="RotateCcw" @click="reset">重置</apple-link></header>
          <apple-segmented-control v-model="config.material" label="材质" :items="materialOptions" />
          <apple-input v-model="config.label" label="标签文字" :maxlength="32" />
          <div class="color-controls">
            <apple-color-picker v-model="config.background" label="底色" />
            <apple-color-picker v-model="config.ink" label="文字颜色" />
          </div>
          <template v-if="config.material === 'frosted'">
            <apple-switch v-model="config.frostOnTexture" class="frost-area-toggle" :label="config.frostOnTexture ? '纹理磨砂' : '背景磨砂'" />
            <apple-slider v-model="config.frostBlur" label="磨砂强度" :min="0" :max="32" :format-value="pixels" />
            <apple-slider v-model="config.frostContrast" label="纹理反差" :min="0" :max="200" :format-value="percent" />
            <apple-slider v-model="config.frostTint" label="底色浓度" :min="0" :max="80" :format-value="percent" />
            <apple-segmented-control v-model="config.frostTintArea" label="底色区域" :items="tintAreaOptions" />
          </template>
          <apple-slider v-else v-model="config.opacity" label="纹理强度" :min="0" :max="100" :format-value="percent" />
          <apple-slider v-model="config.scale" label="纹理缩放" :min="25" :max="200" :step="5" :format-value="percent" />
          <apple-slider v-model="config.angle" label="纹理旋转" :min="0" :max="180" :step="5" :format-value="degrees" />
          <apple-slider v-model="config.radius" label="圆角" :min="0" :max="28" :format-value="pixels" />
          <apple-select v-if="config.material === 'texture'" v-model="config.blend" label="混合方式" :items="blendOptions" />
        </section>
      </div>
      <section class="texture-library" aria-labelledby="texture-library-heading">
        <header class="library-heading"><h2 id="texture-library-heading">纹理</h2><apple-link as="button" :icon="Copy" @click="copyStyle">复制样式</apple-link></header>
        <div class="texture-options" role="group" aria-label="选择纹理">
          <apple-link v-for="texture in textures" :key="texture.file" as="button" class="texture-choice" :class="{ 'is-selected': texture.file === selectedFile }" :aria-pressed="texture.file === selectedFile" :label="`使用 ${texture.title}`" @click="selectTexture(texture.file)">
            <span class="texture-choice__sample" :style="swatchStyle(texture)"><span>Aa</span><Check v-if="texture.file === selectedFile" :size="13" aria-hidden="true" /></span>
            <span class="texture-choice__name">{{ texture.title }}</span>
          </apple-link>
        </div>
      </section>
    </template>
    <div v-else class="workshop-loading">
      <apple-empty v-if="loadError" title="纹理加载失败"><apple-link as="button" @click="loadTextures">重新加载</apple-link></apple-empty>
      <apple-spinner v-else label="正在加载纹理" />
    </div>
  </apple-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { Check, Copy, Plus, RotateCcw } from 'lucide-vue-next'
import { useApple } from '../../src'
import TextureTag from './TextureTag.vue'
import { imageUrl } from '../images'
import { createFrostMask, frostMaskPattern } from '../frost-texture'
import { defaultTextureFile, loadTexturePreferences, saveTexturePreferences, textureDefaults } from '../texture-preferences'

interface Texture { file: string; title: string; author: string; sourceUrl: string; licenseUrl: string }
const apple = useApple()
const textureBase = `${import.meta.env.BASE_URL}textures/transparent-textures/`
const textures = ref<Texture[]>([])
const saved = loadTexturePreferences()
const selectedFile = ref(saved.selectedFile)
const previewBackground = ref(saved.previewBackground)
const materialOptions = [{ label: '纹理', value: 'texture' }, { label: '磨砂玻璃', value: 'frosted' }]
const backgroundOptions = [{ label: '网格', value: 'pattern' }, { label: '照片', value: 'photo' }, { label: '纯色', value: 'plain' }]
const tintAreaOptions = [{ label: '背景', value: 'background' }, { label: '纹理', value: 'texture' }]
const previewStyle = { '--preview-photo': `url("${imageUrl('lake.jpg')}")` }
const textureConfigs = reactive(saved.textures)
textureConfigs[selectedFile.value] ??= { ...textureDefaults }
const activeTexture = computed(() => textures.value.find(texture => texture.file === selectedFile.value))
const config = computed(() => textureConfigs[selectedFile.value])
const visible = ref(true)
const loadError = ref(false)
const dimensions = reactive({ width: 110, height: 110 })
const loadedImage = shallowRef<HTMLImageElement>()
const frostMask = computed(() => config.value.material === 'frosted' && loadedImage.value ? createFrostMask(loadedImage.value, config.value.frostContrast, config.value.frostOnTexture) : '')
const frostTintMask = computed(() => config.value.material === 'frosted' && loadedImage.value ? createFrostMask(loadedImage.value, 100, config.value.frostTintArea === 'texture') : '')
const blendOptions = [{ label: '正片叠底', value: 'multiply' }, { label: '柔光', value: 'soft-light' }, { label: '正常', value: 'normal' }]
const percent = (value: number) => `${value}%`
const degrees = (value: number) => `${value}°`
const pixels = (value: number) => `${value}px`
const textureUrl = (texture: Texture) => `${textureBase}${texture.file}`
const tagProps = computed(() => ({ ...config.value, frostMask: frostMask.value, frostTintMask: frostTintMask.value, texture: activeTexture.value ? textureUrl(activeTexture.value) : '', textureWidth: dimensions.width, textureHeight: dimensions.height }))
const swatchStyle = (texture: Texture) => {
  const settings = textureConfigs[texture.file] ?? textureDefaults
  return { '--swatch-image': `url("${textureUrl(texture)}")`, '--swatch-background': settings.background, '--swatch-ink': settings.ink, '--swatch-opacity': settings.opacity / 100, '--swatch-size': `${80 * settings.scale / 75}px auto`, '--swatch-angle': `${settings.angle}deg`, '--swatch-blend': settings.blend }
}
function selectTexture(file: string) {
  textureConfigs[file] ??= { ...textureDefaults }
  selectedFile.value = file
}
watch([selectedFile, textureConfigs, previewBackground], () => saveTexturePreferences({ selectedFile: selectedFile.value, textures: textureConfigs, previewBackground: previewBackground.value }), { deep: true })
const controller = new AbortController()
let image: HTMLImageElement | undefined
async function loadTextures() {
  loadError.value = false
  try {
    const response = await fetch(`${textureBase}manifest.json`, { signal: controller.signal })
    if (!response.ok) throw new Error('Texture manifest unavailable')
    const manifest = await response.json() as { textures: Texture[] }
    if (!manifest.textures?.length) throw new Error('Texture collection is empty')
    textures.value = manifest.textures
    if (!activeTexture.value) selectTexture(textures.value.some(texture => texture.file === defaultTextureFile) ? defaultTextureFile : textures.value[0].file)
  } catch {
    if (!controller.signal.aborted) loadError.value = true
  }
}
watch(activeTexture, texture => {
  if (image) image.onload = null
  loadedImage.value = undefined
  if (!texture) return
  const next = new Image()
  image = next
  next.onload = () => { dimensions.width = next.naturalWidth; dimensions.height = next.naturalHeight; loadedImage.value = next }
  next.src = textureUrl(texture)
})
function reset() {
  textureConfigs[selectedFile.value] = { ...textureDefaults, material: config.value.material }
  visible.value = true
}
async function copyStyle() {
  if (!activeTexture.value) return
  const style = `.texture-tag {\n  position: relative;\n  isolation: isolate;\n  overflow: hidden;\n  background: ${config.value.background};\n  color: ${config.value.ink};\n  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);\n  border-radius: ${config.value.radius}px;\n}\n.texture-tag::before {\n  content: "";\n  position: absolute;\n  z-index: -1;\n  left: 50%;\n  top: 50%;\n  width: calc(100% + 120px);\n  aspect-ratio: 1;\n  background: url("${textureUrl(activeTexture.value)}") center / ${dimensions.width * config.value.scale / 100}px ${dimensions.height * config.value.scale / 100}px repeat;\n  opacity: ${config.value.opacity / 100};\n  mix-blend-mode: ${config.value.blend};\n  transform: translate(-50%, -50%) rotate(${config.value.angle}deg);\n  pointer-events: none;\n}\n/* ${activeTexture.value.title} — ${activeTexture.value.author}; ${activeTexture.value.sourceUrl}; CC BY 3.0: ${activeTexture.value.licenseUrl}; display scale/rotation adjusted. */`
  try {
    const mask = frostMaskPattern(frostMask.value, dimensions.width * config.value.scale / 100, dimensions.height * config.value.scale / 100, config.value.angle)
    const tintMask = frostMaskPattern(frostTintMask.value, dimensions.width * config.value.scale / 100, dimensions.height * config.value.scale / 100, config.value.angle)
    const frostedStyle = `.texture-tag {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: transparent;
  color: ${config.value.ink};
  border: 1px solid rgb(255 255 255 / 45%);
  border-radius: ${config.value.radius}px;
}
.texture-tag::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 0;
  border-radius: inherit;
  clip-path: inset(0 round ${config.value.radius}px);
  pointer-events: none;
  -webkit-backdrop-filter: blur(${config.value.frostBlur}px);
  backdrop-filter: blur(${config.value.frostBlur}px);
  -webkit-mask-image: url("${mask}");
  mask-image: url("${mask}");
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
  mask-mode: alpha;
}
.texture-tag::after {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 0;
  border-radius: inherit;
  clip-path: inset(0 round ${config.value.radius}px);
  pointer-events: none;
  background: color-mix(in srgb, ${config.value.background} ${config.value.frostTint}%, transparent);
  -webkit-mask-image: url("${tintMask}");
  mask-image: url("${tintMask}");
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
  mask-mode: alpha;
}
/* ${activeTexture.value.title} — ${activeTexture.value.author}; ${activeTexture.value.sourceUrl}; CC BY 3.0: ${activeTexture.value.licenseUrl}; texture converted to a luminance/alpha frost mask; scale, rotation and contrast adjusted. */`
    await navigator.clipboard.writeText(config.value.material === 'frosted' ? frostedStyle : style)
    apple.notify('样式已复制', { tone: 'success' })
  } catch { apple.notify('复制失败，请重试', { tone: 'warning' }) }
}
onMounted(loadTextures)
onBeforeUnmount(() => { controller.abort(); if (image) image.onload = null })
</script>

<style scoped>
.texture-workshop { padding: 0; margin-bottom: 40px; }
.texture-workshop :deep(> .apple-card__body) { padding: 0; }
.workshop-layout { display: grid; grid-template-columns: minmax(0, 1fr) 310px; }
.texture-preview { display: flex; min-width: 0; flex-direction: column; padding: 28px; }
.preview-heading { display: flex; justify-content: space-between; gap: 16px; font-size: 11px; color: var(--apple-secondary); }
.preview-heading > span:last-child { font-variant-numeric: tabular-nums; }
.background-options { margin-top: 18px; align-self: flex-start; max-width: 100%; }
.preview-stage { display: flex; flex: 1; min-height: 340px; flex-direction: column; justify-content: center; align-items: center; gap: 32px; margin-block: 24px; padding: 32px 20px; border-radius: 14px; background: color-mix(in srgb, var(--apple-surface-alt) 90%, var(--apple-border) 10%); }
.preview-stage[data-background=pattern] { background-color: #d9e9ef; background-image: repeating-linear-gradient(0deg, transparent 0 15px, rgb(41 79 108 / 35%) 15px 17px, transparent 17px 32px), repeating-linear-gradient(90deg, transparent 0 15px, rgb(41 79 108 / 35%) 15px 17px, transparent 17px 32px), radial-gradient(ellipse at 15% 20%, #eaa37c, transparent 65%), radial-gradient(ellipse at 85% 80%, #759fe6, transparent 70%); }
.preview-stage[data-background=photo] { background-image: var(--preview-photo); background-size: cover; background-position: center; }
.hero-tag { display: flex; justify-content: center; align-items: center; min-height: 100px; width: 100%; }
.hero-tag :deep(.texture-tag--frosted) { width: min(100%, 360px); min-height: 150px; justify-content: center; }
.frost-comparison :deep(.texture-tag) { min-height: 62px; }
.preview-sizes { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; max-width: 100%; }
.preview-sizes > * { align-self: center; }
.texture-credit { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: 10px; color: var(--apple-secondary); }
.texture-credit > div { display: grid; gap: 4px; }
.texture-credit :deep(.apple-link) { font-size: 11px; color: var(--apple-secondary); }
.texture-credit > div :deep(.apple-link) { font-size: 13px; color: var(--apple-text); }
.texture-controls { display: grid; align-content: start; gap: 22px; min-width: 0; padding: 28px; border-left: 1px solid var(--apple-border); }
.controls-heading, .library-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.controls-heading h2, .library-heading h2 { margin: 0; font-size: 14px; font-weight: 600; }
.controls-heading :deep(.apple-link), .library-heading :deep(.apple-link) { color: var(--apple-secondary); font-size: 11px; }
.controls-heading :deep(svg), .library-heading :deep(svg) { width: 13px; height: 13px; }
.texture-controls :deep(.apple-field) { margin-bottom: 0; }
.texture-controls :deep(.apple-field__label) { font-size: 11px; }
.color-controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.color-controls :deep(.apple-color-row) { flex-wrap: wrap; }
.color-controls :deep(.apple-color__value) { font-size: 10px; }
.texture-library { border-top: 1px solid var(--apple-border); padding: 28px; }
.library-heading { margin-bottom: 20px; }
.texture-options { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 20px 14px; }
.texture-choice { min-width: 0; color: var(--apple-secondary); font-weight: 400; text-align: left; }
.texture-choice :deep(> .apple-link__content) { display: flex; flex-direction: column; align-items: stretch; gap: 8px; width: 100%; }
.texture-choice__sample { position: relative; isolation: isolate; display: flex; align-items: center; justify-content: center; width: 100%; height: 68px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--swatch-ink) 10%, transparent); border-radius: 9px; background: var(--swatch-background); color: var(--swatch-ink); }
.texture-choice__sample::before { position: absolute; z-index: -1; content: ''; left: 50%; top: 50%; width: calc(100% + 80px); aspect-ratio: 1; background: var(--swatch-image) center / var(--swatch-size) repeat; opacity: var(--swatch-opacity); mix-blend-mode: var(--swatch-blend); transform: translate(-50%, -50%) rotate(var(--swatch-angle)); }
.texture-choice__sample > span { font-family: Georgia, serif; font-size: 23px; }
.texture-choice__sample > svg { position: absolute; top: 5px; right: 5px; padding: 2px; width: 17px; height: 17px; background: var(--swatch-ink); color: var(--swatch-background); border-radius: 50%; }
.texture-choice__name { font-size: 10px; line-height: 1.5; overflow-wrap: anywhere; }
.texture-choice.is-selected { color: var(--apple-text); }
.texture-choice.is-selected .texture-choice__sample { outline: 2px solid var(--apple-text); outline-offset: 3px; }
.texture-choice:hover .texture-choice__sample { border-color: var(--apple-text); }
.workshop-loading { display: grid; place-items: center; min-height: 400px; padding: 28px; }
@media (max-width: 1100px) { .texture-options { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
@media (max-width: 760px) {
  .workshop-layout { grid-template-columns: minmax(0, 1fr); }
  .texture-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); border-left: 0; border-top: 1px solid var(--apple-border); }
  .controls-heading, .color-controls { grid-column: 1 / -1; }
  .preview-stage { min-height: 270px; }
  .texture-options { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 440px) {
  .texture-preview, .texture-controls, .texture-library { padding: 20px; }
  .texture-controls { grid-template-columns: minmax(0, 1fr); }
  .texture-options { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px 12px; }
  .preview-stage { padding-inline: 14px; }
}
</style>
