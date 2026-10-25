import { expect, test, type Page } from '@playwright/test'
import { materialCatalog } from '../../playground/material/catalog'
import { waitForPageLayout } from './component-navigation'

const navigation = (page: Page) => page.getByRole('navigation', { name: '主导航', exact: true })

test('Material has its own top navigation route, direct entry, refresh and browser history', async ({ page }) => {
  await page.goto('/')
  await navigation(page).getByRole('link', { name: 'Material', exact: true }).click()
  await expect(page).toHaveURL(/\/material$/)
  await expect(page).toHaveTitle('Material · Apptify')
  await expect(navigation(page).getByRole('link', { name: 'Material', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('.material-card')).toHaveCount(materialCatalog.length)
  await page.reload()
  await expect(page.locator('.material-card')).toHaveCount(materialCatalog.length)
  await navigation(page).getByRole('link', { name: '组件', exact: true }).click()
  await expect(page).toHaveURL(/\/components$/)
  await expect(page.locator('.material-demo')).toHaveCount(0)
  await expect(page.locator('#apple-button')).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/material$/)
  await expect(page.locator('.material-card')).toHaveCount(materialCatalog.length)
  await page.goto('/material#material-select')
  await expect(page.locator('#material-select')).toBeInViewport()
})

test('all 37 Material families render real, styled custom elements without runtime errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (/Failed to resolve component|has no CSS for|Unhandled error/.test(message.text())) errors.push(message.text())
  })
  await page.goto('/material')
  await expect(page.locator('.material-demo')).toHaveCount(materialCatalog.length)
  await waitForPageLayout(page)
  const results = await page.locator('.material-demo').evaluateAll(demos => demos.map(demo => {
    const name = demo.getAttribute('data-material-component')!
    const element = demo.querySelector(`m-${name}`)
    const shadow = element?.shadowRoot
    const bounds = demo.getBoundingClientRect()
    return {
      name,
      visible: bounds.width > 0 && bounds.height > 0,
      upgraded: !!element && !!customElements.get(element.localName),
      shadow: !!shadow,
      styled: !!shadow && (shadow.adoptedStyleSheets.length > 0 || !!shadow.querySelector('style')),
      content: !!shadow?.children.length,
    }
  }))
  expect(results.map(result => result.name).sort()).toEqual(materialCatalog.map(item => item.name).sort())
  for (const result of results) {
    expect(result, result.name).toMatchObject({ visible: true, upgraded: true, shadow: true, styled: true, content: true })
  }
  expect(errors).toEqual([])
})

test('Material buttons, input, switch and select update the Vue model', async ({ page }) => {
  await page.goto('/material')
  const buttons = page.locator('#material-button')
  await buttons.getByRole('button', { name: '主要操作', exact: true }).click()
  await expect(buttons.locator('output')).toHaveText('已点击主要操作')
  await expect(buttons.getByRole('button', { name: '不可用', exact: true })).toBeDisabled()

  const input = page.locator('#material-text-field')
  await input.getByRole('textbox', { name: '姓名', exact: true }).fill('Material 交互验证')
  await expect(input.locator('output')).toHaveText('Material 交互验证')

  const switches = page.locator('#material-switch')
  const toggle = switches.getByRole('switch', { name: '接收通知', exact: true })
  await expect(toggle).toBeChecked()
  await toggle.click()
  await expect(toggle).not.toBeChecked()
  await expect(switches.locator('output')).toHaveText('已关闭')

  const select = page.locator('#material-select')
  await select.locator('m-select').locator('[part~="field"]').click()
  await select.getByRole('option', { name: '杭州', exact: true }).click()
  await expect(select.locator('output')).toHaveText('目的地：杭州')
})

for (const width of [320, 768, 1440]) {
  test(`Material sliders fill their preview and remain interactive at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/material#material-slider')
    await waitForPageLayout(page)
    const card = page.locator('#material-slider')
    const geometry = await card.locator('m-slider').evaluateAll(sliders => sliders.map(slider => {
      const host = slider.getBoundingClientRect()
      const container = slider.parentElement!.getBoundingClientRect()
      const track = slider.shadowRoot!.querySelector('[part="track"]')!.getBoundingClientRect()
      return { hostWidth: host.width, available: container.width, trackWidth: track.width, right: track.right }
    }))
    expect(geometry).toHaveLength(2)
    for (const item of geometry) {
      expect(item.hostWidth).toBeGreaterThan(200)
      expect(Math.abs(item.hostWidth - item.available)).toBeLessThan(1)
      expect(item.trackWidth).toBeGreaterThan(item.available * 0.9)
      expect(item.right).toBeLessThanOrEqual(width)
    }
    const volume = card.getByRole('slider', { name: '音量', exact: true })
    await volume.focus()
    await volume.press('ArrowRight')
    await expect(volume).toHaveAttribute('aria-valuenow', '70')
    const low = card.getByRole('slider', { name: '价格区间 minimum', exact: true })
    const high = card.getByRole('slider', { name: '价格区间 maximum', exact: true })
    await low.focus()
    await low.press('Home')
    await high.focus()
    await high.press('End')
    await expect(card.locator('output')).toHaveText('音量 70 · 区间 0–100')
    await card.screenshot({ path: test.info().outputPath(`material-sliders-${width}.png`) })
  })
}

test('Material more-actions menu stays attached through scrolling, selection and masonry reflow', async ({ page }) => {
  await page.setViewportSize({ width: 1470, height: 900 })
  await page.goto('/material')
  await waitForPageLayout(page)
  const card = page.locator('#material-menu')
  const trigger = card.getByRole('button', { name: '更多操作', exact: true })
  const menu = card.locator('m-menu').locator('[part="menu"]')
  const expectAligned = async () => {
    await expect(menu).toBeVisible()
    await expect.poll(() => card.evaluate(card => {
      const anchor = card.querySelector('m-button')!.getBoundingClientRect()
      const surface = card.querySelector('m-menu')!.shadowRoot!.querySelector('[part="menu"]')!.getBoundingClientRect()
      return Math.max(Math.abs(surface.left - anchor.left), Math.min(Math.abs(surface.top - anchor.bottom), Math.abs(surface.bottom - anchor.top)))
    })).toBeLessThan(1)
  }
  await trigger.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await trigger.click()
  await expectAligned()
  await page.mouse.wheel(0, 80)
  await expectAligned()
  for (const width of [900, 1470]) {
    await page.setViewportSize({ width, height: 900 })
    await waitForPageLayout(page)
    await expectAligned()
  }
  await card.getByRole('menuitem', { name: '删除', exact: true }).click()
  await expect(card.locator('output')).toHaveText('已选择：delete')
  await expect(menu).toBeHidden()
  await trigger.click()
  await expectAligned()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
})

for (const width of [390, 1470]) {
  test(`Material menu stays anchored when it flips above the button at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 801 })
    await page.goto('/material')
    await waitForPageLayout(page)
    const card = page.locator('#material-menu')
    const trigger = card.getByRole('button', { name: '更多操作', exact: true })
    const menu = card.locator('m-menu').locator('[part="menu"]')
    await trigger.evaluate(element => window.scrollBy({ top: element.getBoundingClientRect().bottom - innerHeight, behavior: 'instant' }))
    await trigger.click()
    await expect(menu).toBeVisible()
    await expect.poll(() => card.evaluate(card => {
      const anchor = card.querySelector('m-button')!.getBoundingClientRect()
      const surface = card.querySelector('m-menu')!.shadowRoot!.querySelector('[part="menu"]')!.getBoundingClientRect()
      return Math.max(Math.abs(surface.left - anchor.left), Math.abs(surface.bottom - anchor.top))
    })).toBeLessThan(1)
    expect((await menu.boundingBox())!.x + (await menu.boundingBox())!.width).toBeLessThanOrEqual(width - 16)
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
  })
}

test('Material modal closes and releases the top layer when the page unmounts', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await navigation(page).getByRole('link', { name: 'Material', exact: true }).click()
  const card = page.locator('#material-dialog')
  const modal = card.locator('m-dialog').locator('dialog')
  await card.getByRole('button', { name: '打开对话框', exact: true }).click()
  await expect(modal).toBeVisible()
  await card.getByRole('button', { name: '取消', exact: true }).click()
  await expect(modal).toBeHidden()
  await expect(card.locator('output')).toHaveText('已取消')
  await card.getByRole('button', { name: '打开对话框', exact: true }).click()
  await expect(modal).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('m-dialog')).toHaveCount(0)
  await page.getByRole('link', { name: '浏览全部组件', exact: true }).click()
  await expect(page).toHaveURL(/\/components$/)
  expect(errors).toEqual([])
})

for (const panel of [
  { name: 'drawer', open: '打开导航抽屉', close: null, status: null },
  { name: 'bottom-sheet', open: '打开底部面板', close: '创建分享链接', status: '已创建分享链接' },
  { name: 'side-sheet', open: '打开侧边面板', close: '完成', status: '项目已更新' },
]) {
  test(`Material ${panel.name} hides its closed native dialog and cleans up an open panel on navigation`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/')
    await navigation(page).getByRole('link', { name: 'Material', exact: true }).click()
    const card = page.locator(`#material-${panel.name}`)
    const nativeDialog = card.locator(`m-${panel.name}`).locator('dialog')
    await expect(nativeDialog).toHaveCount(1)
    await expect(nativeDialog).toHaveJSProperty('open', false)
    await expect(nativeDialog).toHaveCSS('display', 'none')
    await expect(nativeDialog).toBeHidden()

    await card.getByRole('button', { name: panel.open, exact: true }).click()
    await expect(nativeDialog).toHaveJSProperty('open', true)
    await expect(nativeDialog).toBeVisible()
    if (panel.close) await card.getByRole('button', { name: panel.close, exact: true }).click()
    else await page.keyboard.press('Escape')
    await expect(nativeDialog).toHaveJSProperty('open', false)
    await expect(nativeDialog).toHaveCSS('display', 'none')
    await expect(nativeDialog).toBeHidden()
    if (panel.status) await expect(card.locator('output')).toHaveText(panel.status)

    await card.getByRole('button', { name: panel.open, exact: true }).click()
    await expect(nativeDialog).toHaveJSProperty('open', true)
    await expect(nativeDialog).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator(`m-${panel.name}`)).toHaveCount(0)
    await page.getByRole('link', { name: '浏览全部组件', exact: true }).click()
    await expect(page).toHaveURL(/\/components$/)
    expect(errors).toEqual([])
  })
}

test('Material follows light and dark themes while its CSS leaves Apple pages unchanged', async ({ page }) => {
  const snapshot = async () => page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const brand = getComputedStyle(document.querySelector('.brand')!)
    const heading = getComputedStyle(document.querySelector('.home-intro h1')!)
    return {
      pageBackground: root.backgroundColor,
      materialPrimary: root.getPropertyValue('--mtrl-sys-color-primary'),
      brand: { font: brand.fontFamily, size: brand.fontSize, color: brand.color },
      heading: { font: heading.fontFamily, size: heading.fontSize, color: heading.color, margin: heading.margin },
    }
  })
  for (const [theme, scheme, primary] of [['浅色', 'light', '#6750a4'], ['深色', 'dark', '#d0bcff']]) {
    await page.goto('/settings')
    await page.getByRole('button', { name: theme, exact: true }).click()
    await navigation(page).getByRole('link', { name: '首页', exact: true }).click()
    await waitForPageLayout(page)
    const before = await snapshot()
    await navigation(page).getByRole('link', { name: 'Material', exact: true }).click()
    const scope = page.locator('.apptify-material')
    await expect(scope).toHaveAttribute('data-theme-mode', scheme)
    expect(await scope.evaluate(element => getComputedStyle(element).getPropertyValue('--mtrl-sys-color-primary').trim().toLowerCase())).toBe(primary)
    await navigation(page).getByRole('link', { name: '首页', exact: true }).click()
    await waitForPageLayout(page)
    expect(await snapshot()).toEqual(before)
  }
})

for (const width of [320, 390, 768, 1440]) {
  test(`Material examples fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/material')
    await expect(page.locator('.material-card')).toHaveCount(materialCatalog.length)
    await waitForPageLayout(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    const overflowingCards = await page.locator('.material-card').evaluateAll(cards => cards.filter(card => {
      const bounds = card.getBoundingClientRect()
      return bounds.left < -1 || bounds.right > innerWidth + 1
    }).map(card => card.id))
    expect(overflowingCards).toEqual([])
    await page.screenshot({ path: test.info().outputPath(`material-${width}.png`), fullPage: true })
  })
}
