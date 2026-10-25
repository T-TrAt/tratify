import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vueDirectory = resolve(root, 'vendor/material/src/vue')
const files = readdirSync(vueDirectory).filter(name => name.endsWith('.ts') && !name.endsWith('.d.ts')).sort().map(name => resolve(vueDirectory, name))
const program = ts.createProgram(files, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: true,
  baseUrl: root, paths: { 'material/*': ['vendor/material/src/*'] },
})
const checker = program.getTypeChecker()
const camel = name => name.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
const pascal = name => camel(name).replace(/^./, char => char.toUpperCase())
const key = node => ts.isStringLiteralLike(node) || ts.isIdentifier(node) ? node.text : node.getText()
const path = node => relative(root, node.getSourceFile().fileName).replaceAll('\\', '/')

function unwrap(node) {
  while (node && (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node))) node = node.expression
  return node
}
function declaration(node) {
  let symbol = checker.getSymbolAtLocation(node)
  if (symbol?.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol)
  return symbol?.valueDeclaration ?? symbol?.declarations?.[0]
}
function object(node) {
  node = unwrap(node)
  if (node && ts.isIdentifier(node)) return object(declaration(node)?.initializer)
  return node && ts.isObjectLiteralExpression(node) ? node : undefined
}
function members(node) {
  const result = new Map()
  for (const property of object(node)?.properties ?? []) {
    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) continue
    result.set(key(property.name), { node: property, value: ts.isShorthandPropertyAssignment(property) ? property.name : property.initializer })
  }
  return result
}
function literal(node) {
  node = unwrap(node)
  return node && ts.isStringLiteralLike(node) ? node.text : undefined
}
function values(node) {
  node = unwrap(node)
  return node && ts.isArrayLiteralExpression(node) ? node.elements.map(literal).filter(Boolean) : []
}
function description(node) {
  const symbol = node.name && checker.getSymbolAtLocation(node.name)
  return symbol ? ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\s+/g, ' ').trim() : ''
}
function typeText(type, node) {
  return checker.typeToString(type, node, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope).replace(/import\("[^"]+"\)\./g, '')
}
function returnType(node) {
  const type = checker.getTypeAtLocation(node)
  const signature = checker.getSignaturesOfType(type, ts.SignatureKind.Call)[0]
  if (!signature) throw new Error(`No callable signature: ${node.getText()}`)
  return typeText(checker.getReturnTypeOfSignature(signature), node)
}
function sourceSpec(call) {
  const argument = unwrap(call.arguments[0])
  if (ts.isPropertyAccessExpression(argument) && argument.name.text === 'spec') {
    const element = declaration(argument.expression)
    const initializer = unwrap(element?.initializer)
    if (!initializer || !ts.isCallExpression(initializer)) throw new Error(`No element spec: ${argument.getText()}`)
    const spec = object(initializer.arguments[0])
    return { spec, componentType: initializer.typeArguments?.[0] ? checker.getTypeFromTypeNode(initializer.typeArguments[0]) : undefined }
  }
  return { spec: object(argument), componentType: undefined }
}

const documents = {}
for (const filename of files) {
  const source = program.getSourceFile(filename)
  if (!source) throw new Error(`Missing source: ${filename}`)
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement) || !statement.modifiers?.some(item => item.kind === ts.SyntaxKind.ExportKeyword)) continue
    for (const entry of statement.declarationList.declarations) {
      const call = unwrap(entry.initializer)
      if (!call || !ts.isCallExpression(call) || !ts.isIdentifier(call.expression) || !['createComponent', 'createDeclaration'].includes(call.expression.text)) continue
      const { spec, componentType } = sourceSpec(call)
      if (!spec) throw new Error(`Unable to resolve ${entry.name.getText()}`)
      const fields = members(spec)
      const slug = literal(fields.get('name')?.value)
      if (!slug) throw new Error(`Missing spec name for ${entry.name.getText()}`)
      const name = entry.name.getText()
      const isDeclaration = call.expression.text === 'createDeclaration'
      const exposedTypeNode = entry.type && ts.isTypeReferenceNode(entry.type) ? entry.type.typeArguments?.[1] : undefined
      const exposedType = exposedTypeNode ? checker.getTypeFromTypeNode(exposedTypeNode) : undefined
      const properties = members(fields.get('properties')?.value)
      const specEvents = members(fields.get('events')?.value)
      const emitsUpdates = specEvents.size > 0
      const model = literal(fields.get('model')?.value)
      const props = [], events = [], slots = [], methods = []
      const entryFor = (group, name, type, description) => ({ id: `${slug}-${group}-${name.replaceAll(/[^a-zA-Z0-9-]/g, '-')}`, name, type, description })
      for (const [attribute, definition] of members(fields.get('attributes')?.value)) {
        const value = members(definition.value)
        const type = literal(value.get('type')?.value)
        if (!['string', 'number', 'boolean'].includes(type)) throw new Error(`Unknown attribute type: ${slug}.${attribute}`)
        const property = camel(attribute)
        const shadowed = properties.has(property)
        const propName = shadowed ? `default${pascal(property)}` : property
        const doc = description(definition.node)
        props.push(entryFor('prop', propName, type, `${shadowed ? `初始 ${property}，对应 ` : '对应 '}<m-${slug}> 的 ${attribute} 属性。${doc ? ` ${doc}` : ''}`))
      }
      for (const [property, definition] of properties) {
        const getter = members(definition.value).get('get')?.value
        if (!getter) throw new Error(`Missing getter: ${slug}.${property}`)
        const type = returnType(getter)
        props.push(entryFor('prop', property, type, emitsUpdates
          ? `实时 ${property}，可使用 v-model:${property} 绑定；组件事件触发时同步更新值。`
          : `实时 ${property}，通过 :${property} 受控传入；组件不会自动发出更新事件。`))
        if (emitsUpdates) events.push(entryFor('event', `update:${property}`, `(value: NonNullable<${type}>) => void`, `组件事件触发且 ${property} 与传入值不同时，更新绑定值。`))
      }
      if (model) {
        const live = props.find(prop => prop.name === model)
        if (!live) throw new Error(`Missing model property: ${slug}.${model}`)
        props.push(entryFor('prop', 'modelValue', live.type, `v-model 的绑定值，等同于 ${model}。`))
        if (emitsUpdates) events.push(entryFor('event', 'update:modelValue', `(value: NonNullable<${live.type}>) => void`, `组件事件触发且 ${model} 与绑定值不同时，更新 v-model。`))
      }
      if (fields.has('form')) props.push(entryFor('prop', 'name', 'string', '表单字段名称，传给关联的自定义元素。'))
      const typeSource = componentType?.getSymbol()?.declarations?.[0]?.getSourceFile().fileName
      const constantsPath = typeSource && resolve(dirname(typeSource), 'constants.ts')
      const constants = constantsPath && program.getSourceFile(constantsPath)
      const optionKeys = { VARIANTS: 'variant', SIZES: 'size', SHAPES: 'shape', ORIENTATIONS: 'orientation', POSITIONS: 'position', TYPES: 'type', SELECTION_MODES: 'selection' }
      for (const statement of constants?.statements ?? []) {
        if (!ts.isVariableStatement(statement)) continue
        for (const declaration of statement.declarationList.declarations) {
          const suffix = Object.keys(optionKeys).find(key => declaration.name.getText().endsWith('_' + key))
          const prop = suffix && props.find(prop => prop.name === optionKeys[suffix])
          const options = [...members(declaration.initializer).values()].map(member => literal(member.value))
          if (prop && options.length && options.every(Boolean)) prop.options = options
        }
      }
      const textSlot = members(fields.get('slot')?.value)
      const textAttribute = literal(textSlot.get('attribute')?.value)
      if (textAttribute && !props.some(prop => prop.name === textAttribute)) props.push(entryFor('prop', textAttribute, 'string', '默认插槽的回退文本。'))
      for (const [event, definition] of specEvents) {
        const detail = members(definition.value).get('detail')?.value
        const payload = detail ? returnType(detail) : 'unknown'
        const doc = description(definition.node)
        events.push(entryFor('event', event, `CustomEvent<${payload}>`, `通过 event.detail 读取 ${event} 事件的数据。${doc ? ` ${doc}` : ''}`))
      }
      slots.push(entryFor('slot', 'default', '() => VNodeChild', isDeclaration ? '子项的文本或内容，由所属父组件读取。' : textAttribute ? `组件文本内容；未提供时使用 ${textAttribute}。` : '组件的默认内容。'))
      for (const slot of values(fields.get('slots')?.value)) slots.push(entryFor('slot', slot, '() => VNodeChild', `对应 <template #${slot}> 命名插槽。`))
      for (const method of values(fields.get('methods')?.value)) {
        const symbol = componentType?.getProperty(method)
        if (!symbol) throw new Error(`Missing method type: ${slug}.${method}`)
        const publicMethod = exposedType?.getProperty(method)
        if (!publicMethod) throw new Error(`Missing public element method: ${slug}.${method}`)
        const type = typeText(checker.getTypeOfSymbolAtLocation(publicMethod, spec), spec)
        const doc = ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\s+/g, ' ').trim()
        methods.push(entryFor('method', `element.${method}`, type, `通过组件 ref 的 element.${method}() 调用。${doc ? ` ${doc}` : ''}`))
      }
      documents[slug] = {
        name, source: path(entry), specSource: path(spec), tag: `m-${slug}`, declaration: isDeclaration, ...(model ? { model } : {}),
        props, events, slots, methods,
        notes: [
          'HTML 属性、class、style 和原生事件透传到宿主自定义元素；aria-label 用于设置无障碍名称。',
          ...(model ? [`默认 v-model 绑定 ${model}；事件对象使用 event.detail，update:* 事件直接提供更新值。`] : []),
          ...(methods.length ? ['组件 ref 只暴露 element；公开方法通过 ref.value?.element 调用。'] : []),
          ...(isDeclaration ? ['这是父组件读取的声明式子项，应放在对应的 Material 父组件内。'] : []),
        ],
      }
    }
  }
}
if (Object.keys(documents).length !== 50) throw new Error(`Expected 50 Material Vue adapters, found ${Object.keys(documents).length}`)
const output = resolve(root, 'playground/material/api.json')
const json = `${JSON.stringify(documents, null, 2)}\n`
if (!existsSync(output) || readFileSync(output, 'utf8') !== json) writeFileSync(output, json)
console.log(`Generated ${Object.keys(documents).length} Material component APIs in ${relative(root, output)}`)
