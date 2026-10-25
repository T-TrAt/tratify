import { build, transform } from 'esbuild'
import * as sass from 'sass'
import postcss from 'postcss'
import ts from 'typescript'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glassThemeCss } from './material-glass-themes.mjs'

const project = fileURLToPath(new URL('../', import.meta.url))
const vendor = join(project, 'vendor/material')
const source = join(vendor, 'src')
const output = join(vendor, 'generated')
const snapshot = JSON.parse(await readFile(join(vendor, 'SOURCE.json'), 'utf8'))
const manifestCode = await transform(await readFile(join(vendor, 'style-manifest.ts'), 'utf8'), { loader: 'ts', format: 'esm' })
const { componentStyles } = await import(`data:text/javascript;base64,${Buffer.from(manifestCode.code).toString('base64')}`)
const sassOptions = { loadPaths: [join(source, 'styles')], style: 'compressed', logger: sass.Logger.silent }
const banner = `/*! Material ${snapshot.version} | Copyright (c) 2025 floor | MIT | ${snapshot.revision} */`

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await build({
  entryPoints: [join(source, 'vue/index.ts')],
  outfile: join(output, 'index.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  external: ['vue'],
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'eof',
  banner: { js: banner },
  plugins: [{
    name: 'material-shadow-styles',
    setup(builder) {
      builder.onResolve({ filter: /^material\/elements\/css\// }, args => ({ path: args.path.split('/').at(-1), namespace: 'material-css' }))
      builder.onLoad({ filter: /.*/, namespace: 'material-css' }, args => {
        const entry = args.path === 'ripple' ? { source: 'utilities/ripple', dependencies: [] } : componentStyles[args.path]
        if (!entry) throw new Error(`Unknown Material stylesheet: ${args.path}`)
        const css = sass.compileString(`@use "${entry.source}";`, sassOptions).css
        const dependencies = args.path === 'ripple' ? [] : ['ripple', ...entry.dependencies]
        return {
          contents: `${dependencies.map(name => `import "material/elements/css/${name}";`).join('\n')}\nimport { registerStyles } from ${JSON.stringify(join(source, 'elements/styles.ts'))};\nregisterStyles({ ${JSON.stringify(args.path)}: ${JSON.stringify(css)} });`,
          loader: 'js', resolveDir: project,
        }
      })
    },
  }],
})

const themeOptions = JSON.parse(await readFile(join(project, 'playground/material/themes.json'), 'utf8'))
const themeSources = [...new Set(['baseline', ...themeOptions.filter(option => option.source !== 'glass-ui-kit').map(option => option.name)])]
const theme = sass.compileString(`${themeSources.map(name => `@use "themes/${name}";`).join('\n')}\n@use "base/tokens";`, sassOptions).css
const glassPalettes = JSON.parse(await readFile(join(project, 'vendor/glass-ui-kit/palettes.json'), 'utf8'))
const stylesheet = postcss.parse(theme + '\n' + glassThemeCss(glassPalettes))
stylesheet.walkRules(rule => {
  rule.selectors = rule.selectors.map(selector => {
    return `${selector.replaceAll(':root', '.apptify-material')}:where(.apptify-material)`
  })
})
await writeFile(join(output, 'style.css'), `${banner}\n${stylesheet.toString()}\n.apptify-material{--mtrl-ref-typeface-brand:system-ui,sans-serif;--mtrl-ref-typeface-plain:system-ui,sans-serif;color:var(--mtrl-sys-color-on-surface);font-family:var(--mtrl-ref-typeface-plain);}\n`)

const options = {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true, skipLibCheck: true, esModuleInterop: true, declaration: true, emitDeclarationOnly: true,
  noEmitOnError: true, rootDir: source, outDir: join(output, 'types'), types: [],
}
const processTypes = join(output, 'process.d.ts')
await writeFile(processTypes, 'declare const process: { env: { NODE_ENV?: string } };\n')
const program = ts.createProgram([join(source, 'vue/index.ts'), join(source, 'vue/css.d.ts'), processTypes], options)
const diagnostics = ts.getPreEmitDiagnostics(program)
if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: value => value, getCurrentDirectory: () => project, getNewLine: () => '\n' }))
const writes = []
const emitted = program.emit(undefined, (filename, text) => {
  const sourceFile = join(source, relative(join(output, 'types'), filename)).replace(/\.d\.ts$/, '.ts')
  const declaration = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true)
  const edits = []
  function visit(node) {
    if (ts.isStringLiteral(node) && node.text.startsWith('.')) {
      const parent = node.parent
      const isModule = ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node)
        || (ts.isLiteralTypeNode(parent) && ts.isImportTypeNode(parent.parent))
        || (ts.isModuleDeclaration(parent) && parent.name === node)
      if (isModule) {
        const dependency = ts.resolveModuleName(node.text, sourceFile, options, ts.sys).resolvedModule
        if (!dependency) throw new Error(`Cannot resolve ${node.text} from ${sourceFile}`)
        let specifier = relative(dirname(sourceFile), dependency.resolvedFileName).replaceAll('\\', '/').replace(/(?:\.d)?\.ts$/, '.js')
        if (!specifier.startsWith('.')) specifier = `./${specifier}`
        edits.push({ start: node.getStart(declaration), end: node.getEnd(), value: JSON.stringify(specifier) })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(declaration)
  for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.value + text.slice(edit.end)
  writes.push((async () => {
    await mkdir(dirname(filename), { recursive: true })
    await writeFile(filename, text.replace(/^import "material\/elements\/css\/[^"\n]+";\r?\n/gm, ''))
  })())
})
if (emitted.emitSkipped) throw new Error('Material declaration generation failed')
await Promise.all(writes)
await rm(processTypes)
await writeFile(join(output, 'index.d.ts'), 'export * from "./types/vue/index.js";\n')
await writeFile(join(output, 'LICENSE'), await readFile(join(vendor, 'LICENSE')))
await writeFile(join(output, 'GLASS-UI-KIT-LICENSE'), await readFile(join(project, 'vendor/glass-ui-kit/LICENSE')))
console.log(`Material ${snapshot.version}: Vue components, scoped theme and types built.`)
await import('./prepare-material-docs.mjs')
await import('./prepare-material-examples.mjs')
