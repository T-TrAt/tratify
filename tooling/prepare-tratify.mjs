import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

export async function prepareTratify({
  generated = join(root, 'vendor/material/generated'),
  destination = join(root, 'packages/tratify'),
} = {}) {
  const manifest = JSON.parse(await readFile(join(destination, 'package.json'), 'utf8'))
  const [runtime, declaration, css, materialLicense, paletteLicense, materialSource, paletteSource] = await Promise.all([
    readFile(join(generated, 'index.js'), 'utf8'),
    readFile(join(generated, 'index.d.ts'), 'utf8'),
    readFile(join(generated, 'style.css'), 'utf8'),
    readFile(join(generated, 'LICENSE'), 'utf8'),
    readFile(join(generated, 'GLASS-UI-KIT-LICENSE'), 'utf8'),
    readFile(join(root, 'vendor/material/SOURCE.json'), 'utf8'),
    readFile(join(root, 'vendor/glass-ui-kit/SOURCE.json'), 'utf8'),
  ])
  const dist = join(destination, 'dist')
  await rm(dist, { recursive: true, force: true })
  await mkdir(dist, { recursive: true })
  await cp(join(generated, 'types'), join(dist, 'types'), { recursive: true })
  const banner = `/*! ${manifest.name} ${manifest.version} | Copyright (c) 2026 ${manifest.author} | MIT */\n`
  await writeFile(join(dist, 'index.js'), banner + runtime)
  await writeFile(join(dist, 'index.d.ts'), declaration)
  await writeFile(join(dist, 'style.css'), banner + css.replaceAll('.apptify-material', '.tratify'))
  await writeFile(join(destination, 'THIRD_PARTY_LICENSES.txt'), [
    'Material components — floor/material 3.2.4',
    'https://github.com/floor/material', materialLicense,
    'Glass UI Kit palette data — @ziyarago/glass-ui-kit 1.32.0',
    'https://github.com/ziyarago/glass-ui-kit', paletteLicense,
  ].join('\n\n'))
  await writeFile(join(destination, 'SOURCE.json'), JSON.stringify({
    name: manifest.name, version: manifest.version, author: manifest.author,
    material: JSON.parse(materialSource), palettes: JSON.parse(paletteSource),
    adaptations: 'Standalone Material package. Theme selectors use .tratify; the original M-prefixed Vue component names and m-* Web Components are preserved.',
  }, null, 2) + '\n')
}
