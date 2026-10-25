import { expect, test, type Page } from '@playwright/test'
import { waitForPageLayout } from './component-navigation'
import glassPalettes from '../../vendor/glass-ui-kit/palettes.json' with { type: 'json' }

const navigate = (page: Page, label: string) => page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('link', { name: label, exact: true }).click()
const choices = (page: Page) => page.getByRole('group', { name: 'Material 主题色', exact: true })
const preview = (page: Page) => page.locator('.material-theme-preview')
const scope = (page: Page) => page.locator('.material-content > .apptify-material')
const rgb = (hex: string) => `rgb(${[0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(', ')})`

test('all Material palettes update the actual preview in light and dark without recoloring Apple UI', async ({ page }) => {
  await page.goto('/settings')
  const palettes = [
    ['默认紫', 'baseline', '6750a4', 'd0bcff'], ['海洋蓝', 'ocean', '006493', '8dcdff'],
    ['森林绿', 'forest', '3f4f2f', 'a5b58d'], ['日落橙', 'sunset', 'b34700', 'ffb686'],
    ['沙漠金', 'desert', '7a580c', 'edc06c'], ['黑白', 'monochrome', '000000', 'ffffff'],
  ]
  for (const [index, mode] of ['浅色', '深色'].entries()) {
    await page.getByRole('button', { name: mode, exact: true }).click()
    const before = await page.locator('.settings-page').evaluate(element => getComputedStyle(element).getPropertyValue('--apple-accent'))
    for (const [label, name, light, dark] of palettes) {
      await choices(page).getByRole('button', { name: label, exact: true }).click()
      await expect(preview(page)).toHaveAttribute('data-theme', name)
      await expect(preview(page)).toHaveAttribute('data-theme-mode', index ? 'dark' : 'light')
      await expect(choices(page).getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(preview(page).getByRole('button', { name: '主要按钮', exact: true })).toHaveCSS('background-color', rgb(index ? dark : light))
    }
    expect(await page.locator('.settings-page').evaluate(element => getComputedStyle(element).getPropertyValue('--apple-accent'))).toBe(before)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--mtrl-sys-color-primary'))).toBe('')
  }
})

test('Material palette persists across routes and reloads, colors popovers, and resets independently or with all settings', async ({ page }) => {
  await page.goto('/material')
  await page.locator('.material-heading').getByRole('link', { name: '主题色', exact: true }).click()
  await expect(page).toHaveURL(/\/settings#setting-material$/)
  await expect(page.getByRole('tree', { name: '设置目录', exact: true }).getByRole('treeitem', { name: 'Material 主题色', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { name: '深色', exact: true }).click()
  await choices(page).getByRole('button', { name: '森林绿', exact: true }).click()
  await navigate(page, 'Material')
  await expect(scope(page)).toHaveAttribute('data-theme', 'forest')
  await expect(page.locator('#material-button').getByRole('button', { name: '主要操作', exact: true })).toHaveCSS('background-color', rgb('a5b58d'))
  const card = page.locator('#material-menu')
  await card.getByRole('button', { name: '更多操作', exact: true }).click()
  const menu = card.locator('m-menu').locator('[part="menu"]')
  await expect(menu).toBeVisible()
  const surface = await scope(page).evaluate(element => getComputedStyle(element).getPropertyValue('--mtrl-sys-color-surface-container').trim().replace('#', ''))
  await expect(menu).toHaveCSS('background-color', rgb(surface))
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(scope(page)).toHaveAttribute('data-theme', 'forest')
  await navigate(page, '设置')
  await expect(choices(page).getByRole('button', { name: '森林绿', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '恢复默认 Material 主题色', exact: true }).click()
  await expect(preview(page)).toHaveAttribute('data-theme', 'baseline')
  await expect(page.getByRole('button', { name: '深色', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await choices(page).getByRole('button', { name: '海洋蓝', exact: true }).click()
  await page.getByRole('button', { name: '恢复默认设置', exact: true }).click()
  await expect(preview(page)).toHaveAttribute('data-theme', 'baseline')
  await expect(page.getByRole('button', { name: '浅色', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await navigate(page, 'Material')
  await page.reload()
  await expect(scope(page)).toHaveAttribute('data-theme', 'baseline')
})

test('invalid stored Material preferences fall back to the default and remain editable', async ({ page }) => {
  await page.goto('/settings')
  for (const value of ['{', '{"name":"missing-theme"}', '[]']) {
    await page.evaluate(value => localStorage.setItem('apptify:material-theme:v1', value), value)
    await page.reload()
    await expect(preview(page)).toHaveAttribute('data-theme', 'baseline')
  }
  await choices(page).getByRole('button', { name: '海洋蓝', exact: true }).click()
  await page.reload()
  await expect(preview(page)).toHaveAttribute('data-theme', 'ocean')
})

test('seven Glass UI Kit palettes retain their source colors, support both modes and keep text readable', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('radiogroup', { name: '配色系列', exact: true }).getByText('Glass UI Kit', { exact: true }).click()
  const palettes = [
    ['Glass', 'glass', 600], ['Roomia', 'roomia', 700], ['Mist', 'mist', 500], ['Teal', 'teal', 500],
    ['Sapphire', 'sapphire', 500], ['Copper', 'copper', 600], ['Mauve', 'mauve', 600],
  ] as const
  await expect(choices(page).getByRole('button')).toHaveCount(7)
  for (const mode of ['浅色', '深色']) {
    await page.getByRole('button', { name: mode, exact: true }).click()
    for (const [label, name, lightStop] of palettes) {
      await choices(page).getByRole('button', { name: label, exact: true }).click()
      await expect(preview(page)).toHaveAttribute('data-theme', name)
      const sourceColor = glassPalettes[name].primary[mode === '深色' ? 200 : lightStop]
      await expect(preview(page).getByRole('button', { name: '主要按钮', exact: true })).toHaveCSS('background-color', sourceColor.replace(/[\d.]+/g, number => String(Number(number))))
      const result = await preview(page).evaluate(element => {
        const style = getComputedStyle(element)
        const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
        const color = (value: string) => { ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3) }
        const luminance = (rgb: number[]) => rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0)
        const token = (role: string) => style.getPropertyValue(`--mtrl-sys-color-${role}`).trim()
        const pairs = ['primary', 'secondary', 'tertiary', 'error', 'surface', 'surface-variant', 'primary-container', 'secondary-container', 'tertiary-container', 'error-container'].map(role => [role, `on-${role}`])
        pairs.push(['inverse-surface', 'inverse-on-surface'])
        const button = element.querySelector('m-button')!.shadowRoot!.querySelector('button')!
        return {
          primary: token('primary'),
          primaryColor: color(token('primary')),
          buttonColor: color(getComputedStyle(button).backgroundColor),
          contrasts: pairs.map(([background, foreground]) => {
            const a = luminance(color(token(background))), b = luminance(color(token(foreground)))
            return { role: background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) }
          }),
        }
      })
      expect(result.primary).toBe(sourceColor)
      expect(result.buttonColor).toEqual(result.primaryColor)
      for (const item of result.contrasts) expect(item.ratio, `${name} ${mode} ${item.role}`).toBeGreaterThanOrEqual(4.5)
    }
  }
  await page.reload()
  await expect(choices(page).getByRole('button', { name: 'Mauve', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await navigate(page, 'Material')
  await expect(scope(page)).toHaveAttribute('data-theme', 'mauve')
  await page.reload()
  await expect(scope(page)).toHaveAttribute('data-theme', 'mauve')
})

for (const width of [320, 1440]) {
  test(`Glass UI Kit palette choices fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/settings#setting-material')
    await page.getByRole('radiogroup', { name: '配色系列', exact: true }).getByText('Glass UI Kit', { exact: true }).click()
    await choices(page).getByRole('button', { name: 'Mauve', exact: true }).click()
    await waitForPageLayout(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.locator('#setting-material').screenshot({ path: test.info().outputPath(`glass-palettes-${width}.png`) })
  })
}

for (const width of [320, 768, 1440]) {
  test(`Material palette settings fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/settings#setting-material')
    await choices(page).getByRole('button', { name: '海洋蓝', exact: true }).click()
    await waitForPageLayout(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    for (const button of await choices(page).getByRole('button').all()) {
      const box = await button.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width)
    }
    await page.locator('#setting-material').screenshot({ path: test.info().outputPath(`material-palette-${width}.png`) })
  })
}
