<template>
  <section class="material-document-example" :aria-label="`${doc.name} 编辑器`" data-testid="material-playground" :data-component="doc.name">
    <LiveVueEditor :files="files" :baseline-files="baselineFiles" active-file="App.vue" preview-surface material reset-label="恢复当前配置" @restore="reset">
      <template #configuration>
        <section class="configuration" role="region" :aria-label="`${doc.name} 配置`">
          <header class="config-heading"><h3>配置 {{ doc.name }}</h3><apple-link as="button" @click="reset">重置</apple-link></header>
          <div class="config-grid">
            <div v-for="entry in doc.props" :key="entry.name" class="prop-control" :data-prop-control="entry.name">
              <apple-checkbox v-if="controls[entry.name].kind !== 'boolean' || !initial.props[entry.name].enabled" v-model="config.props[entry.name].enabled" :label="`使用 ${entry.name}`" />
              <apple-switch v-if="controls[entry.name].kind === 'boolean'" :model-value="config.props[entry.name].value === true" @update:model-value="config.props[entry.name].value = $event" :label="entry.name" :disabled="!config.props[entry.name].enabled" />
              <apple-select v-else-if="controls[entry.name].kind === 'select'" :model-value="String(config.props[entry.name].value)" @update:model-value="config.props[entry.name].value = String($event)" :items="controls[entry.name].options.map(value => ({ label: value, value }))" :label="entry.name" :disabled="!config.props[entry.name].enabled" />
              <apple-textarea v-else-if="['json', 'expression'].includes(controls[entry.name].kind)" :model-value="String(config.props[entry.name].value)" @update:model-value="config.props[entry.name].value = String($event)" :label="entry.name" :rows="3" :error="errors[entry.name] || ''" :disabled="!config.props[entry.name].enabled" />
              <apple-input v-else :model-value="String(config.props[entry.name].value)" @update:model-value="config.props[entry.name].value = String($event)" :label="entry.name" :error="errors[entry.name] || ''" :disabled="!config.props[entry.name].enabled" />
            </div>
          </div>
          <apple-accordion v-if="doc.slots.length" :items="[{ label: '插槽', value: 'slots' }]">
            <template #item>
              <div class="slot-controls">
                <div v-for="entry in doc.slots" :key="entry.name" class="slot-control">
                  <apple-switch v-model="config.slots[entry.name].enabled" :label="`自定义 ${entry.name}`" />
                  <apple-textarea v-if="config.slots[entry.name].enabled" v-model="config.slots[entry.name].code" :label="`${entry.name} 模板`" :rows="4" />
                </div>
              </div>
            </template>
          </apple-accordion>
          <apple-alert v-if="compileError" tone="danger" title="配置有误" :message="compileError" />
        </section>
      </template>
    </LiveVueEditor>
    <nav v-if="related.length" class="related-components" aria-label="相关组件 API"><router-link v-for="item in related" :key="item.slug" :to="`/component-docs/material-${item.slug}`" custom v-slot="{ href, navigate }"><apple-link :href="href" @click="navigate">{{ item.name }} API</apple-link></router-link></nav>
  </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc'
import { useApple } from '../../src'
import { propExpression } from '../editor/component-playground'
import examples from './examples.json'
import api from './api.json'
import { createMaterialConfig, generateMaterialCode, materialControl, materialEditorSource, type MaterialDocument } from './playground'
import { materialComponentName, materialChildComponents } from './documents'
import { useMaterialTheme } from './theme'

const props = defineProps<{ name: string; component?: string }>()
const LiveVueEditor = defineAsyncComponent(() => import('../editor/LiveVueEditor.vue'))
const apple = useApple()
const { name: theme } = useMaterialTheme()
const doc = computed(() => (api as Record<string, MaterialDocument>)[props.component ?? props.name])
const source = materialEditorSource(doc.value, (examples as Record<string, string>)[props.name])
const context = computed(() => ({ theme: theme.value, scheme: apple.theme.value.current.scheme, assetBase: new URL(import.meta.env.BASE_URL, location.origin).href }))
const initial = createMaterialConfig(doc.value, source)
const config = reactive(createMaterialConfig(doc.value, source))
const controls = computed(() => Object.fromEntries(doc.value.props.map(entry => [entry.name, materialControl(entry)])))
const baselineFiles = computed(() => ({ 'App.vue': generateMaterialCode(doc.value, source, initial, context.value) }))
const files = shallowRef(baselineFiles.value)
const errors = ref<Record<string, string>>({})
const compileError = ref('')
const related = computed(() => Object.keys(materialChildComponents).map(slug => ({ slug, name: materialComponentName(slug) })).filter(item => new RegExp(`\\b${item.name}\\b`).test(source)))
let timer: ReturnType<typeof setTimeout> | undefined
function update() {
  errors.value = {}
  for (const entry of doc.value.props) {
    if (!config.props[entry.name].enabled) continue
    try { propExpression(entry, config.props[entry.name]) }
    catch (error) { errors.value[entry.name] = error instanceof Error ? error.message : String(error) }
  }
  if (Object.keys(errors.value).length) { compileError.value = '请修正标记的属性。'; return }
  try {
    const code = generateMaterialCode(doc.value, source, config, context.value)
    const parsed = parse(code, { filename: 'App.vue' })
    if (parsed.errors.length) throw parsed.errors[0]
    const script = compileScript(parsed.descriptor, { id: doc.value.name })
    const result = compileTemplate({ source: parsed.descriptor.template!.content, filename: 'App.vue', id: doc.value.name, compilerOptions: { bindingMetadata: script.bindings } })
    if (result.errors.length) throw result.errors[0]
    compileError.value = ''; files.value = { 'App.vue': code }
  } catch (error) { compileError.value = error instanceof Error ? error.message : String(error) }
}
function reset() { clearTimeout(timer); Object.assign(config, createMaterialConfig(doc.value, source)); update() }
watch([config, context], () => { clearTimeout(timer); timer = setTimeout(update, 150) }, { deep: true })
onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.material-document-example { min-width: 0; }
.configuration, .slot-controls, .slot-control { display: grid; gap: 20px; min-width: 0; }
.config-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.config-heading h3 { margin: 0; font-size: 16px; overflow-wrap: anywhere; }
.config-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.prop-control { display: grid; align-content: start; gap: 10px; min-width: 0; }
.slot-control + .slot-control { border-top: 1px solid var(--apple-border); padding-top: 20px; }
.related-components { display: flex; flex-wrap: wrap; gap: 12px 24px; margin-top: 20px; }
.related-components :deep(.apple-link) { color: var(--apple-secondary); font-size: 12px; }
@media (max-width: 1100px) { .config-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
