import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { parse, compileScript } from 'vue/compiler-sfc'
import { transform } from 'esbuild'
import { materialCatalog } from '../../playground/material/catalog'
import type { ComponentDocument } from '../../playground/editor/contract'

const api: Record<string, ComponentDocument> = JSON.parse(readFileSync(new URL('../../playground/material/api.json', import.meta.url), 'utf8'))
const examples: Record<string, string> = JSON.parse(readFileSync(new URL('../../playground/material/examples.json', import.meta.url), 'utf8'))

test('every Material card opens its own code and API, including refresh and return navigation', async ({ page }) => {
  await page.goto('/material')
  await expect(page.locator('.material-card .documentation-entry a')).toHaveCount(materialCatalog.length)
  await expect(page.locator('.material-counterpart')).toHaveCount(0)
  for (const item of materialCatalog) {
    const link = page.locator(`#material-${item.name} .documentation-entry a`)
    await expect(link).toHaveText('代码与 API')
    await expect(link).toHaveAttribute('href', `/component-docs/material-${item.name}`)
  }
  await page.locator('#material-timepicker .documentation-entry a').click()
  await expect(page).toHaveURL(/\/component-docs\/material-timepicker$/)
  await expect(page.locator('h1')).toContainText('MTimepicker')
  await expect(page.getByTestId('material-playground')).toHaveAttribute('data-component', 'MTimepicker')
  await expect(page.locator('#timepicker-prop-format')).toBeAttached()
  await page.reload()
  await expect(page.locator('#timepicker-prop-format')).toBeAttached()
  await page.getByRole('navigation', { name: '组件文档路径' }).getByRole('link', { name: '表单', exact: true }).click()
  await expect(page).toHaveURL(/\/material#material-timepicker$/)
  await expect(page.locator('#material-timepicker')).toBeInViewport()
})

test('all Material primary and child APIs render the correct interfaces without runtime errors', async ({ page }) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const [slug, doc] of Object.entries(api)) {
    await page.goto(`/component-docs/material-${slug}`)
    await expect(page.locator('h1')).toContainText(doc.name)
    await expect(page).toHaveTitle(new RegExp(`${doc.name} · Apptify`))
    const document = page.getByTestId('component-document')
    await expect(document).toBeVisible()
    for (const [section, entries] of Object.entries({ props: doc.props, events: doc.events, slots: doc.slots, methods: doc.methods })) {
      await expect(document.locator(`#${section} .api-entry h3`)).toHaveText(entries.map(entry => entry.name))
    }
    const playground = page.getByTestId('material-playground')
    await expect(playground).toHaveAttribute('data-component', doc.name)
    await expect(playground.locator('[data-prop-control]')).toHaveCount(doc.props.length)
    await expect(playground.getByRole('tab', { name: '低代码', exact: true })).toBeVisible()
    const frame = page.frameLocator('.vue-repl iframe')
    await expect(frame.getByRole('region', { name: `${doc.name} 示例`, exact: true })).toBeVisible({ timeout: 15000 })
    await expect(frame.locator(`m-${slug}`)).not.toHaveCount(0)
    await expect(frame.locator('.runtime-error')).toHaveCount(0)
  }
  expect(errors).toEqual([])
})

test('copied code uses Material imports and related child APIs stay within Material', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/component-docs/material-menu')
  await page.getByRole('button', { name: '复制当前文件', exact: true }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("from 'apptify/material'")
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('_pgProps')
  await page.getByRole('link', { name: 'MMenuItem API', exact: true }).click()
  await expect(page.locator('h1')).toContainText('MMenuItem')
  await expect(page.locator('#menu-item-prop-shortcut')).toBeAttached()
  await page.getByRole('navigation', { name: '组件文档路径' }).getByRole('link', { name: '操作', exact: true }).click()
  await expect(page).toHaveURL(/\/material#material-menu$/)
  await page.goto('/component-docs/material-split-button')
  await expect(page.getByRole('link', { name: 'MMenuItem API', exact: true })).toHaveAttribute('href', '/component-docs/material-menu-item')
})

test('all standalone copied examples mount and produce styled Material elements', async ({ page, baseURL }) => {
  await page.goto('/material')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (/\[Vue warn\]|Unhandled error/.test(message.text())) errors.push(message.text()) })
  for (const [slug, example] of Object.entries(examples)) {
    const { descriptor } = parse(example.replaceAll('import.meta.env.BASE_URL', JSON.stringify('/')), { filename: 'App.vue' })
    const compiled = compileScript(descriptor, { id: slug, inlineTemplate: true })
    const { code } = await transform(compiled.content, { loader: 'ts', format: 'esm' })
    const source = code.replace(/from ["']vue["']/g, `from "${baseURL}/node_modules/.vite/deps/vue.js"`)
      .replace(/from ["']apptify\/material["']/g, `from "${baseURL}/vendor/material/generated/index.js"`)
      .replace(/import ["']apptify\/material\/style.css["'];?/g, '')
    const result = await page.evaluate(async ({ source, slug, vuePath }) => {
      const { createApp, nextTick } = await import(/* @vite-ignore */ vuePath)
      const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
      const component = (await import(/* @vite-ignore */ url)).default
      const host = document.createElement('div'); document.body.append(host)
      const app = createApp(component); app.mount(host); await nextTick()
      const element = host.querySelector(`m-${slug}`)
      const result = { exists: !!element, styled: !!element?.shadowRoot && (element.shadowRoot.adoptedStyleSheets.length > 0 || !!element.shadowRoot.querySelector('style')) }
      app.unmount(); host.remove(); URL.revokeObjectURL(url)
      return result
    }, { source, slug, vuePath: `${baseURL}/node_modules/.vite/deps/vue.js` })
    expect(result, slug).toEqual({ exists: true, styled: true })
  }
  expect(errors).toEqual([])
})

for (const width of [390, 1440]) {
  test(`Material API and source code fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/component-docs/material-slider')
    await expect(page.locator('#slider-prop-secondValue')).toBeAttached()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.screenshot({ path: test.info().outputPath(`material-api-${width}.png`), fullPage: true })
  })
}
