import { expect, test, type Locator, type Page } from '@playwright/test'

async function expectAlignedRipple(button: Locator) {
  await expect.poll(() => button.evaluate(element => {
    const buttonBounds = element.getBoundingClientRect()
    const ripple = element.querySelector('.mtrl-ripple')!
    const rippleBounds = ripple.getBoundingClientRect()
    return Math.max(...(['left', 'top', 'right', 'bottom'] as const)
      .map(edge => Math.abs(buttonBounds[edge] - rippleBounds[edge])))
  })).toBeLessThan(0.5)
  expect(await button.evaluate(element => {
    const ripple = element.querySelector('.mtrl-ripple')!
    return {
      clipping: getComputedStyle(ripple).overflow,
      radius: getComputedStyle(ripple).borderRadius === getComputedStyle(element).borderRadius,
    }
  })).toEqual({ clipping: 'hidden', radius: true })
}

async function pressWithRipple(page: Page, button: Locator) {
  await button.scrollIntoViewIfNeeded()
  const bounds = (await button.boundingBox())!
  const point = { x: bounds.width * 0.3, y: bounds.height * 0.4 }
  await page.mouse.move(bounds.x + point.x, bounds.y + point.y)
  await page.mouse.down()
  try {
    const wave = button.locator('.mtrl-ripple-wave.active').last()
    await expect(wave).toBeAttached()
    const origin = await wave.evaluate(element => {
      const style = (element as HTMLElement).style
      return {
        x: parseFloat(style.left) + parseFloat(style.width) / 2,
        y: parseFloat(style.top) + parseFloat(style.height) / 2,
      }
    })
    expect(origin.x).toBeCloseTo(point.x, 0)
    expect(origin.y).toBeCloseTo(point.y, 0)
    await expectAlignedRipple(button)
  } finally {
    await page.mouse.up()
  }
}

for (const surface of ['gallery', 'editor'] as const) {
  test(`FAB menu ripple covers the trigger and starts at the pointer in the ${surface}`, async ({ page }) => {
    await page.goto(surface === 'gallery' ? '/material#material-fab-menu' : '/component-docs/material-fab-menu')
    const host = surface === 'gallery'
      ? page.locator('#material-fab-menu m-fab-menu')
      : page.frameLocator('.vue-repl iframe').locator('m-fab-menu')
    const button = host.locator('.mtrl-fab-menu__fab')
    await expect(button).toBeVisible()
    await expectAlignedRipple(button)
    await pressWithRipple(page, button)
    const item = host.getByRole('menuitem', { name: '新建文档', exact: true })
    await expect(item).toBeVisible()
    await item.click()
    await expect(item).not.toBeVisible()
    await expectAlignedRipple(button)
  })
}

for (const [size, width] of [['medium', 80], ['large', 96]] as const) {
  test(`FAB list ripple follows the ${size} trigger as it shrinks and restores`, async ({ page }) => {
    await page.goto('/material#material-fab-menu')
    const host = page.locator('#material-fab-menu m-fab-menu')
    await expect(host.locator('.mtrl-fab-menu__fab')).toBeVisible()
    await host.evaluate((element, size) => {
      element.setAttribute('size', size)
      element.setAttribute('presentation', 'list')
    }, size)
    const button = host.locator('.mtrl-fab-menu__fab')
    await expect.poll(async () => (await button.boundingBox())?.width).toBe(width)
    await expectAlignedRipple(button)
    await pressWithRipple(page, button)
    await expect(host).toHaveAttribute('open', '')
    await expect.poll(async () => (await button.boundingBox())?.width).toBe(56)
    await expectAlignedRipple(button)
    await pressWithRipple(page, button)
    await expect(host).not.toHaveAttribute('open')
    await expect.poll(async () => (await button.boundingBox())?.width).toBe(width)
    await expectAlignedRipple(button)
  })
}
