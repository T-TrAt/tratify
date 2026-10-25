import { parse } from 'vue/compiler-sfc'
import type { ApiEntry, ComponentDocument } from '../editor/contract'
import { propControl, propExpression, type PlaygroundConfig, type PropControl } from '../editor/component-playground'

export interface MaterialDocument extends ComponentDocument { model?: string; props: (ApiEntry & { options?: string[] })[] }
interface Node {
  type: number; tag?: string; name?: string; value?: { content: string }; exp?: { content: string }; arg?: { content: string }
  props?: Node[]; children?: Node[]; loc: { source: string; start: { offset: number }; end: { offset: number } }
}
const camel = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
const safe = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')
const buttonEditorSource = `<script setup lang="ts">
import { MButton } from 'apptify/material'
import 'apptify/material/style.css'
</script>

<template>
  <section class="apptify-material" data-theme="baseline" data-theme-mode="light">
    <MButton variant="filled" size="s" shape="round" type="button" label="按钮" />
  </section>
</template>
`
export const materialEditorSource = (doc: MaterialDocument, source: string) => doc.name === 'MButton' ? buttonEditorSource : source
function findTarget(node: Node, name: string): Node | undefined {
  if (node.tag === name) return node
  for (const child of node.children ?? []) { const target = findTarget(child, name); if (target) return target }
}
function targetIn(source: string, doc: MaterialDocument) {
  const parsed = parse(source, { filename: 'App.vue' })
  const target = findTarget(parsed.descriptor.template!.ast as unknown as Node, doc.name)
  if (!target) throw new Error(`示例中缺少 ${doc.name}`)
  return { target, descriptor: parsed.descriptor }
}
const namedSlot = (node: Node) => node.tag === 'template' ? node.props?.find(prop => prop.type === 7 && prop.name === 'slot')?.arg?.content : undefined
function literal(expression: string): unknown {
  try { return JSON.parse(expression) } catch {
    if (/^'(?:[^'\\]|\\.)*'$/.test(expression)) return expression.slice(1, -1).replace(/\\(['\\])/g, '$1')
  }
}
export function materialControl(entry: MaterialDocument['props'][number]): PropControl {
  return entry.options?.length ? { name: entry.name, kind: 'select', options: entry.options, required: !!entry.required } : propControl(entry)
}
export function createMaterialConfig(doc: MaterialDocument, source: string): PlaygroundConfig {
  source = materialEditorSource(doc, source)
  const { target } = targetIn(source, doc)
  return {
    props: Object.fromEntries(doc.props.map(entry => {
      const control = materialControl(entry)
      const attribute = target.props?.find(prop => prop.type === 6 ? camel(prop.name!) === entry.name : prop.name === 'bind' && camel(prop.arg?.content ?? '') === entry.name)
      const initial = attribute?.type === 6 ? (entry.type === 'boolean' ? true : attribute.value?.content ?? '') : attribute?.exp ? literal(attribute.exp.content) : undefined
      const model = target.props?.some(prop => prop.type === 7 && prop.name === 'model' && (camel(prop.arg?.content ?? doc.model ?? 'modelValue') === entry.name || entry.name === 'modelValue'))
      const enabled = initial !== undefined || (control.kind === 'boolean' && !attribute && !model)
      const value = control.kind === 'boolean' ? initial === true
        : initial !== undefined ? (typeof initial === 'string' ? initial : JSON.stringify(initial))
        : control.kind === 'select' ? control.options[0] : control.kind === 'number' ? '0' : control.kind === 'text' ? '' : 'null'
      return [entry.name, { enabled, value }]
    })),
    slots: Object.fromEntries(doc.slots.map(entry => {
      const nodes = (target.children ?? []).filter(child => entry.name === 'default' ? !namedSlot(child) : namedSlot(child) === entry.name)
      const code = entry.name === 'default' ? nodes.map(node => node.loc.source).join('') : nodes[0]?.children?.map(node => node.loc.source).join('') ?? ''
      return [entry.name, { name: entry.name, enabled: false, code }]
    })),
  }
}

export function generateMaterialCode(doc: MaterialDocument, source: string, config: PlaygroundConfig, context: { theme?: string; scheme?: string; assetBase?: string } = {}): string {
  source = materialEditorSource(doc, source)
  const { target, descriptor } = targetIn(source, doc)
  const enabled = doc.props.filter(entry => config.props[entry.name].enabled)
  const keys = new Set(enabled.map(entry => entry.name))
  const overridesModel = keys.has('modelValue') || (!!doc.model && keys.has(doc.model))
  const attributes = (target.props ?? []).filter(prop => {
    if (prop.type === 6) return !keys.has(camel(prop.name!)) && prop.name !== 'ref'
    if (prop.name === 'bind') return !keys.has(camel(prop.arg?.content ?? ''))
    if (prop.name === 'model') return !(prop.arg ? keys.has(camel(prop.arg.content)) || (prop.arg.content === doc.model && overridesModel) : overridesModel)
    return true
  }).map(prop => prop.loc.source)
  const fallback = doc.props.find(entry => entry.description === '默认插槽的回退文本。')?.name
  let children = (target.children ?? []).filter(child => !(fallback && keys.has(fallback) && !namedSlot(child))).map(child => ({ name: namedSlot(child), code: child.loc.source }))
  for (const slot of Object.values(config.slots).filter(slot => slot.enabled)) {
    if (!/^[\w-]+$/.test(slot.name)) throw new Error('插槽名称只能包含字母、数字、下划线和连字符。')
    if (slot.name === 'default') children = [{ name: undefined, code: slot.code }, ...children.filter(child => child.name)]
    else children = [...children.filter(child => child.name !== slot.name), { name: slot.name, code: `<template #${slot.name}>${slot.code}</template>` }]
  }
  const component = `<${doc.name} ref="_pgDemo" v-bind="_pgProps" v-on="_pgListeners" ${attributes.join(' ')}>${children.map(child => child.code).join('')}</${doc.name}>`
  const expressions = enabled.map(entry => `${safe(entry.name)}: (${propExpression(entry, config.props[entry.name])})`).join(',\n  ')
  const listeners = [...new Set(['click', ...doc.events.map(entry => entry.name)])].map(name => {
    const property = name.startsWith('update:') ? name.slice(7) : undefined
    const assign = property ? `if (${safe(property)} in _pgProps) _pgProps[${safe(property)}] = args[0]; ` : ''
    return `${safe(name)}: (...args: unknown[]) => { ${assign}_pgRecord(${safe(name)}, args) }`
  }).join(',\n  ')
  const script = `
import { reactive as _pgReactive, ref as _pgRef } from 'vue'
const _pgProps = _pgReactive<Record<string, unknown>>({
  ${expressions}
})
const _pgDemo = _pgRef()
const _pgEvents = _pgRef<string[]>([])
function _pgRecord(name: string, args: unknown[]) {
  const seen = new WeakSet()
  const value = JSON.stringify(args.map(value => value instanceof CustomEvent ? value.detail : value instanceof Event ? { type: value.type } : value), (_, value) => {
    if (value instanceof HTMLElement) return '<' + value.localName + '>'
    if (value && typeof value === 'object') { if (seen.has(value)) return '[circular]'; seen.add(value) }
    return value
  })
  _pgEvents.value = [..._pgEvents.value.slice(-11), name + ' ' + value]
}
const _pgListeners = {
  ${listeners}
}
`
  const methods = doc.methods.map(method => {
    const name = method.name.replace(/^element\./, '')
    return `<button type="button" @click="_pgDemo?.element?.[${safe(name).replaceAll('"', '&quot;')}]?.()">${method.name}()</button>`
  }).join('')
  const panel = `
  <section class="pg-events" aria-label="事件记录">
    ${methods ? `<div class="pg-actions">${methods}</div>` : ''}
    <header><h3>事件记录</h3><button type="button" @click="_pgEvents = []">清除记录</button></header>
    <textarea :value="_pgEvents.join('\\n')" aria-label="事件记录内容" readonly rows="6" placeholder="等待操作…" />
  </section>
`
  const edits = [
    { start: target.loc.start.offset, end: target.loc.end.offset, code: component },
    { start: descriptor.scriptSetup!.loc.end.offset, end: descriptor.scriptSetup!.loc.end.offset, code: script },
    { start: descriptor.template!.loc.end.offset, end: descriptor.template!.loc.end.offset, code: panel },
  ]
  let result = source
  for (const edit of edits.sort((a, b) => b.start - a.start)) result = result.slice(0, edit.start) + edit.code + result.slice(edit.end)
  result = result.replace('data-theme="baseline"', `data-theme="${context.theme ?? 'baseline'}" aria-label="${doc.name} 示例"`).replace('data-theme-mode="light"', `data-theme-mode="${context.scheme ?? 'light'}"`)
  if (context.assetBase) result = result.replaceAll('import.meta.env.BASE_URL', safe(context.assetBase))
  result += `
<style scoped>
.apptify-material { padding: 24px; min-width: 0; }
.pg-events { margin: 0 24px 24px; border-top: 1px solid var(--apple-border); padding-top: 20px; }
.pg-events header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.pg-events h3 { margin: 0; font-size: 14px; }
.pg-events button { border: 0; background: transparent; color: var(--apple-accent); cursor: pointer; font: inherit; }
.pg-events textarea { display: block; box-sizing: border-box; width: 100%; padding: 12px; border: 1px solid var(--apple-border); border-radius: 8px; resize: none; background: var(--apple-surface); color: var(--apple-text); font: 12px/1.7 ui-monospace, monospace; }
.pg-actions { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
</style>
`
  return result
}
