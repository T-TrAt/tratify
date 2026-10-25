import { describe, expect, it } from 'vitest'
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc'
import api from '../playground/material/api.json'
import examples from '../playground/material/examples.json'
import { materialChildComponents } from '../playground/material/documents'
import { createMaterialConfig, generateMaterialCode, materialControl, type MaterialDocument } from '../playground/material/playground'

const documents = api as Record<string, MaterialDocument>
const sources = examples as Record<string, string>
const compile = (code: string) => {
  const { descriptor, errors } = parse(code, { filename: 'App.vue' })
  expect(errors).toEqual([])
  const script = compileScript(descriptor, { id: 'material-playground' })
  expect(compileTemplate({ source: descriptor.template!.content, filename: 'App.vue', id: 'material-playground', compilerOptions: { bindingMetadata: script.bindings } }).errors).toEqual([])
  return descriptor
}
describe('Material low-code generation', () => {
  it('renders one button with the same active defaults as its controls', () => {
    const config = createMaterialConfig(documents.button, sources.button)
    expect(config.props.variant).toEqual({ enabled: true, value: 'filled' })
    expect(config.props.size).toEqual({ enabled: true, value: 's' })
    expect(config.props.shape).toEqual({ enabled: true, value: 'round' })
    expect(config.props.label).toEqual({ enabled: true, value: '按钮' })
    const result = compile(generateMaterialCode(documents.button, sources.button, config))
    expect(result.template!.content.match(/<MButton\b/g)).toHaveLength(1)
    expect(result.template!.content).not.toContain('v-for')
    expect(result.scriptSetup!.content).not.toContain('buttonVariants')
    expect(result.template!.content).toContain('v-bind="_pgProps"')
  })
  for (const [slug, doc] of Object.entries(documents)) {
    it(`${doc.name} compiles its initial configuration and each slot override`, () => {
      const source = sources[materialChildComponents[slug] ?? slug]
      const config = createMaterialConfig(doc, source)
      const code = generateMaterialCode(doc, source, config)
      compile(code)
      expect(code).toContain("from 'apptify/material'")
      expect(Object.keys(config.props)).toEqual(doc.props.map(entry => entry.name))
      for (const slot of doc.slots) {
        const next = createMaterialConfig(doc, source)
        next.slots[slot.name].enabled = true
        next.slots[slot.name].code = '<span>自定义内容</span>'
        compile(generateMaterialCode(doc, source, next))
      }
    })
  }
  it('uses upstream enum values and replaces an original model instead of creating competing bindings', () => {
    expect(materialControl(documents.button.props.find(prop => prop.name === 'variant')!).options).toEqual(['filled', 'tonal', 'outlined', 'elevated', 'text'])
    const config = createMaterialConfig(documents.select, sources.select)
    config.props.modelValue = { enabled: true, value: '"hangzhou"' }
    const result = compile(generateMaterialCode(documents.select, sources.select, config))
    expect(result.template!.content).not.toContain('v-model="city"')
    expect(result.template!.content).toContain('<MSelectOption value="chengdu">')
  })
  it('rejects invalid numeric values and escapes text while preserving compositional slots', () => {
    const config = createMaterialConfig(documents.slider, sources.slider)
    config.props.min = { enabled: true, value: 'invalid(' }
    expect(() => generateMaterialCode(documents.slider, sources.slider, config)).toThrow('请输入数字')
    const card = createMaterialConfig(documents.card, sources.card)
    card.props.headline = { enabled: true, value: '</script><template>{{bad}}' }
    const code = generateMaterialCode(documents.card, sources.card, card)
    compile(code)
    expect(code).toContain('\\u003c/script>')
    expect(code).toContain('<template #actions>')
  })
})
