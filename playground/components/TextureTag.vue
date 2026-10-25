<template>
  <AppleTag class="texture-tag" :class="[`texture-tag--${size}`, { 'texture-tag--frosted': material === 'frosted' }]" :style="surfaceStyle" :label="label" :closable="closable" :disabled="disabled" @close="emit('close', $event)">
    <span v-if="material === 'frosted'" class="texture-tag__frost" aria-hidden="true" />
    <span v-if="material === 'frosted'" class="texture-tag__tint" aria-hidden="true" />
    <span class="texture-tag__texture" aria-hidden="true" />
    <span class="texture-tag__label"><slot>{{ label }}</slot></span>
  </AppleTag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AppleTag } from '../../src'
import { frostMaskPattern } from '../frost-texture'

const props = withDefaults(defineProps<{
  label: string
  texture: string
  material?: 'texture' | 'frosted'
  frostMask?: string
  frostTintMask?: string
  frostBlur?: number
  frostTint?: number
  background?: string
  ink?: string
  opacity?: number
  scale?: number
  angle?: number
  radius?: number
  blend?: 'multiply' | 'soft-light' | 'normal'
  textureWidth?: number
  textureHeight?: number
  size?: 'small' | 'medium' | 'large'
  closable?: boolean
  disabled?: boolean
}>(), {
  background: '#e0e9d5', ink: '#26382b', opacity: 35, scale: 75, angle: 0,
  radius: 28, blend: 'multiply', textureWidth: 110, textureHeight: 110, size: 'medium',
  material: 'texture', frostMask: '', frostTintMask: '', frostBlur: 18, frostTint: 12,
})
const emit = defineEmits<{ close: [event: Event] }>()
const surfaceStyle = computed(() => ({
  '--texture-image': `url("${props.texture}")`,
  '--texture-background': props.background,
  '--texture-ink': props.ink,
  '--texture-opacity': props.opacity / 100,
  '--texture-size': `${props.textureWidth * props.scale / 100}px ${props.textureHeight * props.scale / 100}px`,
  '--texture-angle': `${props.angle}deg`,
  '--texture-radius': `${props.radius}px`,
  '--texture-blend': props.blend,
  '--frost-blur': `${props.frostBlur}px`,
  '--frost-tint': `${props.frostTint}%`,
  '--frost-mask': props.frostMask ? `url("${frostMaskPattern(props.frostMask, props.textureWidth * props.scale / 100, props.textureHeight * props.scale / 100, props.angle)}")` : 'none',
  '--frost-tint-mask': props.frostTintMask ? `url("${frostMaskPattern(props.frostTintMask, props.textureWidth * props.scale / 100, props.textureHeight * props.scale / 100, props.angle)}")` : 'none',
}))
</script>

<style scoped>
.texture-tag { position: relative; isolation: isolate; --apple-tag-ink: var(--texture-ink); padding: 6px 14px; min-height: 34px; border: 1px solid color-mix(in srgb, var(--texture-ink) 18%, transparent); border-radius: var(--texture-radius); background: var(--texture-background); color: var(--texture-ink); font-size: 13px; line-height: 20px; box-shadow: inset 0 1px 0 rgb(255 255 255 / 35%), 0 1px 2px rgb(0 0 0 / 5%); }
.texture-tag__texture { position: absolute; z-index: -1; left: 50%; top: 50%; width: calc(100% + 120px); aspect-ratio: 1; background-image: var(--texture-image); background-repeat: repeat; background-size: var(--texture-size); background-position: center; opacity: var(--texture-opacity); mix-blend-mode: var(--texture-blend); transform: translate(-50%, -50%) rotate(var(--texture-angle)); pointer-events: none; }
.texture-tag__label { position: relative; min-width: 0; overflow-wrap: anywhere; }
.texture-tag--frosted { background: transparent; border-color: color-mix(in srgb, white 45%, var(--texture-ink) 12%); box-shadow: inset 0 1px 0 rgb(255 255 255 / 60%), 0 5px 18px rgb(25 40 60 / 12%); }
.texture-tag--frosted .texture-tag__texture { display: none; }
.texture-tag__frost, .texture-tag__tint { position: absolute; z-index: -1; inset: 0; border-radius: inherit; clip-path: inset(0 round var(--texture-radius)); pointer-events: none; mask-size: 100% 100%; mask-repeat: no-repeat; mask-mode: alpha; }
.texture-tag__frost { -webkit-backdrop-filter: blur(var(--frost-blur)); backdrop-filter: blur(var(--frost-blur)); -webkit-mask-image: var(--frost-mask); mask-image: var(--frost-mask); }
.texture-tag__tint { background: color-mix(in srgb, var(--texture-background) var(--frost-tint), transparent); -webkit-mask-image: var(--frost-tint-mask); mask-image: var(--frost-tint-mask); }
.texture-tag :deep(> button) { z-index: 1; flex-basis: 32px; width: 32px; margin: -6px -14px -6px 2px; border-radius: 0; color: inherit; }
.texture-tag--small { min-height: 27px; padding: 3px 10px; font-size: 11px; line-height: 19px; }
.texture-tag--small :deep(> button) { flex-basis: 26px; width: 26px; margin: -3px -10px -3px 0; }
.texture-tag--large { min-height: 54px; padding: 13px 22px; font-size: 19px; line-height: 26px; letter-spacing: .01em; }
.texture-tag--large :deep(> button) { flex-basis: 46px; width: 46px; margin: -13px -22px -13px 4px; }
.texture-tag[aria-disabled=true] { opacity: .5; }
</style>
