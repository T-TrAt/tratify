import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc'

const input = fileURLToPath(new URL('../playground/material/MaterialDemo.vue', import.meta.url))
const output = fileURLToPath(new URL('../playground/material/examples.json', import.meta.url))
const { descriptor } = parse(await readFile(input, 'utf8'), { filename: input })
const script = ts.createSourceFile(input + '.ts', descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true)
const declarations = new Map()
const imports = new Map()
for (const statement of script.statements) {
  if (ts.isImportDeclaration(statement)) {
    for (const binding of statement.importClause?.namedBindings?.elements ?? []) imports.set(binding.name.text, statement.moduleSpecifier.text)
  } else if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) declarations.set(declaration.name.getText(script), 'const ' + declaration.getText(script))
  } else if (ts.isFunctionDeclaration(statement)) declarations.set(statement.name.text, statement.getText(script))
}
const iconDeclaration = script.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations]).find(declaration => declaration.name.getText(script) === 'icons')
const icons = new Map(iconDeclaration.initializer.properties.map(property => [property.name.getText(script), property.getText(script)]))
function referencesIn(code) {
  const names = new Set()
  function visit(node) {
    if (ts.isIdentifier(node)) {
      const parent = node.parent
      const key = (ts.isPropertyAccessExpression(parent) && parent.name === node)
        || ((ts.isPropertyAssignment(parent) || ts.isVariableDeclaration(parent) || ts.isParameter(parent)) && parent.name === node)
      if (!key) names.add(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(ts.createSourceFile('example.ts', code, ts.ScriptTarget.Latest, true))
  return names
}
function templateReferences(node, names = new Set()) {
  if (node.type === 1) {
    names.add(node.tag)
    for (const prop of node.props) if (prop.type === 7 && prop.exp) for (const name of referencesIn(prop.exp.content)) names.add(name)
  } else if (node.type === 5) for (const name of referencesIn(node.content.content)) names.add(name)
  for (const child of node.children ?? []) templateReferences(child, names)
  return names
}
const root = descriptor.template.ast.children.find(node => node.type === 1)
const examples = {}
for (const branch of root.children.filter(node => node.type === 1)) {
  const condition = branch.props.find(prop => prop.type === 7 && ['if', 'else-if'].includes(prop.name))
  const name = condition?.exp?.content.match(/^name === '([^']+)'$/)?.[1]
  if (!name) continue
  const template = branch.loc.source.replace(' ' + condition.loc.source, '').replace(/\s+>/g, '>')
  const neededIcons = [...new Set([...template.matchAll(/icons\.(\w+)/g)].map(match => match[1]))]
  const available = new Map(declarations)
  if (neededIcons.length) available.set('icons', `const icons = {\n  ${neededIcons.map(key => icons.get(key)).join(',\n  ')}\n}`)
  available.set('imageUrl', 'const imageUrl = (filename: string) => `${import.meta.env.BASE_URL}images/${filename}`')
  const selected = new Set()
  const references = templateReferences(branch)
  for (let changed = true; changed;) {
    changed = false
    for (const [key, code] of available) {
      if (!selected.has(key) && references.has(key)) {
        selected.add(key)
        for (const reference of referencesIn(code)) references.add(reference)
        changed = true
      }
    }
  }
  const words = references
  const vueImports = [...imports].filter(([key, source]) => source === 'vue' && words.has(key)).map(([key]) => key)
  const materialImports = [...imports].filter(([key, source]) => source.includes('material/generated') && words.has(key)).map(([key]) => key)
  const lines = [
    ...(vueImports.length ? [`import { ${vueImports.join(', ')} } from 'vue'`] : []),
    `import { ${materialImports.join(', ')} } from 'apptify/material'`,
    "import 'apptify/material/style.css'", '',
    ...[...available].filter(([key]) => selected.has(key)).map(([, code]) => code),
  ]
  const status = selected.has('lastAction') ? '\n      <output v-if="lastAction" aria-live="polite">{{ lastAction }}</output>' : ''
  const code = `<script setup lang="ts">\n${lines.join('\n')}\n</script>\n\n<template>\n  <section class="apptify-material" data-theme="baseline" data-theme-mode="light">\n    <div class="material-demo">\n      ${template}${status}\n    </div>\n  </section>\n</template>\n\n<style scoped>\n${descriptor.styles.map(style => style.content.trim()).join('\n')}\n</style>\n`
  const parsed = parse(code, { filename: 'App.vue' })
  if (parsed.errors.length) throw new Error(`${name}: ${parsed.errors}`)
  const compiled = compileScript(parsed.descriptor, { id: name })
  const result = compileTemplate({ source: parsed.descriptor.template.content, filename: 'App.vue', id: name, compilerOptions: { bindingMetadata: compiled.bindings } })
  if (result.errors.length) throw new Error(`${name}: ${result.errors}`)
  examples[name] = code
}
if (Object.keys(examples).length !== 37) throw new Error('Material example coverage changed; check the catalog.')
const json = JSON.stringify(examples, null, 2) + '\n'
if (await readFile(output, 'utf8').catch(() => '') !== json) await writeFile(output, json)
console.log(`Material: ${Object.keys(examples).length} standalone Vue examples prepared.`)
