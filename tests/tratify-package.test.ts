// @vitest-environment node
import { afterEach, expect, it } from 'vitest'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { prepareTratify } from '../tooling/prepare-tratify.mjs'

const root = resolve(import.meta.dirname, '..')
const temporary: string[] = []
const json = async (path: string) => JSON.parse(await readFile(path, 'utf8'))

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

it('only tratify is publishable and its identity uses the owner repository without an Apptify dependency', async () => {
  expect(await json(join(root, 'package.json'))).toMatchObject({ private: true, author: 'T-TrAt' })
  expect(await json(join(root, 'packages/create-apptify/package.json'))).toMatchObject({ private: true })
  const manifest = await json(join(root, 'packages/tratify/package.json'))
  expect(manifest).toMatchObject({ name: 'tratify', version: '0.1.0', author: 'T-TrAt', peerDependencies: { vue: '^3.5.0' } })
  expect(manifest.private).not.toBe(true)
  expect(manifest.repository).toEqual({ type: 'git', url: 'git+https://github.com/T-TrAt/tratify.git', directory: 'packages/tratify' })
  expect(manifest.homepage).toBe('https://github.com/T-TrAt/tratify#readme')
  expect(manifest.bugs.url).toBe('https://github.com/T-TrAt/tratify/issues')
  for (const key of ['dependencies', 'bin']) expect(manifest[key]).toBeUndefined()
  expect(manifest.exports).toEqual({
    '.': { types: './dist/index.d.ts', import: './dist/index.js' }, './style.css': './dist/style.css',
  })
  expect(manifest.files).toEqual(['dist', 'LICENSE', 'THIRD_PARTY_LICENSES.txt', 'SOURCE.json'])
  expect(await readdir(join(root, '.github/workflows')).catch(() => [])).toEqual([])
  await expect(readFile(join(root, '.github/scripts/publish-npm.mjs'))).rejects.toThrow()
})

it('stages only Material runtime, themes and full types while retaining both upstream licenses', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'tratify-package-test-'))
  temporary.push(scratch)
  const generated = join(scratch, 'generated')
  const destination = join(scratch, 'tratify')
  await mkdir(join(generated, 'types/vue'), { recursive: true })
  await mkdir(destination)
  await cp(join(root, 'packages/tratify/package.json'), join(destination, 'package.json'))
  await Promise.all(Object.entries({
    'index.js': '/*! upstream */\nexport const MButton = {}',
    'index.d.ts': 'export * from "./types/vue/index.js";',
    'types/vue/index.d.ts': 'export declare const MButton: unknown;',
    'style.css': '.apptify-material:where(.apptify-material){color:red}.apptify-material[data-theme="ocean"]{color:blue}',
    LICENSE: 'Copyright (c) 2025 floor\nMIT text',
    'GLASS-UI-KIT-LICENSE': 'Copyright (c) 2024-2026 ZiyaraGo Technologies LLC\nMIT palette text',
    'apple.js': 'not part of Material',
  }).map(([file, value]) => writeFile(join(generated, file), value)))
  await prepareTratify({ generated, destination })
  expect((await readdir(join(destination, 'dist'))).sort()).toEqual(['index.d.ts', 'index.js', 'style.css', 'types'])
  expect(await readFile(join(destination, 'dist/index.js'), 'utf8')).toContain('tratify 0.1.0 | Copyright (c) 2026 T-TrAt')
  expect(await readFile(join(destination, 'dist/index.js'), 'utf8')).toContain('/*! upstream */')
  expect(await readFile(join(destination, 'dist/types/vue/index.d.ts'), 'utf8')).toContain('MButton')
  const css = await readFile(join(destination, 'dist/style.css'), 'utf8')
  expect(css).toContain('.tratify:where(.tratify)')
  expect(css).toContain('.tratify[data-theme="ocean"]')
  expect(css).not.toContain('.apptify-material')
  const licenses = await readFile(join(destination, 'THIRD_PARTY_LICENSES.txt'), 'utf8')
  expect(licenses).toContain('Copyright (c) 2025 floor\nMIT text')
  expect(licenses).toContain('Copyright (c) 2024-2026 ZiyaraGo Technologies LLC\nMIT palette text')
  const source = await json(join(destination, 'SOURCE.json'))
  expect(source).toMatchObject({ name: 'tratify', version: '0.1.0', author: 'T-TrAt', material: { name: 'material', version: '3.2.4' } })
  await writeFile(join(destination, 'dist/stale.js'), 'stale')
  await prepareTratify({ generated, destination })
  await expect(readFile(join(destination, 'dist/stale.js'))).rejects.toThrow()
  expect((await json(join(destination, 'package.json'))).name).toBe('tratify')
})
