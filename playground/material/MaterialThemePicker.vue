<template>
  <div class="material-theme-picker">
    <apple-segmented-control v-model="family" :items="families" label="配色系列" />
    <div class="material-theme-options" role="group" aria-label="Material 主题色">
      <apple-link v-for="option in visibleOptions" :key="option.name" as="button" type="button" class="material-theme-choice" :class="{ selected: currentTheme === option.name }" :aria-pressed="currentTheme === option.name" @click="selectTheme(option.name)">
        <span class="apptify-material material-theme-swatch" :data-theme="option.name" :data-theme-mode="scheme" aria-hidden="true"><i /><i /><i /><Check v-if="currentTheme === option.name" class="material-swatch-check" :size="12" /></span>
        <span class="material-theme-label">{{ option.label }}</span>
      </apple-link>
    </div>
    <div class="apptify-material material-theme-preview" :data-theme="currentTheme" :data-theme-mode="scheme" aria-label="Material 主题预览">
      <div class="material-preview-buttons"><MButton>主要按钮</MButton><MButton variant="tonal">辅助按钮</MButton></div>
      <MCheckbox v-model="previewChecked">选中状态</MCheckbox>
    </div>
    <div class="material-theme-footer">
      <apple-link as="button" @click="resetTheme">恢复默认 Material 主题色</apple-link>
      <apple-link v-if="family === 'glass-ui-kit'" href="https://ui-kit.ziyarago.com/colors" external>配色来源</apple-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check } from 'lucide-vue-next'
import { MButton, MCheckbox } from '../../vendor/material/generated/index.js'
import { materialThemeOptions, useMaterialTheme } from './theme'
import '../../vendor/material/generated/style.css'

defineProps<{ scheme: 'light' | 'dark' }>()
const { name: currentTheme, set: selectTheme, reset: resetTheme } = useMaterialTheme()
const themeFamily = () => materialThemeOptions.find(option => option.name === currentTheme.value)?.source ?? 'material'
const family = ref(themeFamily())
const families = [{ label: 'Material', value: 'material' }, { label: 'Glass UI Kit', value: 'glass-ui-kit' }]
const visibleOptions = computed(() => materialThemeOptions.filter(option => (option.source ?? 'material') === family.value))
watch(currentTheme, () => { family.value = themeFamily() })
const previewChecked = ref(true)
</script>

<style scoped>
.material-theme-picker { display: flex; flex-direction: column; gap: 20px; flex: 1; min-width: 0; }
.material-theme-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.material-theme-choice { min-width: 0; padding: 6px; border: 1px solid var(--apple-border); border-radius: 10px; }
.material-theme-choice.selected { border-color: var(--apple-accent); outline: 1px solid var(--apple-accent); }
.material-theme-choice:focus-visible { outline: 3px solid var(--apple-accent); outline-offset: 3px; }
.material-theme-choice :deep(.apple-link__content) { flex-direction: column; width: 100%; gap: 9px; }
.material-theme-swatch { position: relative; display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; height: 62px; padding: 10px; border-radius: 7px; background: var(--mtrl-sys-color-surface-container); }
.material-swatch-check { position: absolute; top: 3px; right: 3px; color: var(--mtrl-sys-color-on-surface); }
.material-theme-swatch i { width: 16px; height: 32px; border-radius: 9px; background: var(--mtrl-sys-color-primary); }
.material-theme-swatch i:nth-child(2) { height: 24px; background: var(--mtrl-sys-color-secondary); }
.material-theme-swatch i:nth-child(3) { height: 18px; background: var(--mtrl-sys-color-tertiary); }
.material-theme-label { display: flex; align-items: center; justify-content: space-between; gap: 4px; width: 100%; color: var(--apple-text); font-size: 11px; }
.material-theme-preview { display: flex; flex-direction: column; align-items: flex-start; gap: 16px; padding: 18px; border-radius: 12px; background: var(--mtrl-sys-color-surface-container-low); }
.material-preview-buttons { display: flex; flex-wrap: wrap; gap: 12px; }
.material-theme-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin-top: auto; font-size: 11px; }
</style>
