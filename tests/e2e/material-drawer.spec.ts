import { expect, test } from '@playwright/test'
import { waitForPageLayout } from './component-navigation'

for (const width of [390, 1470]) {
  for (const dismiss of ['backdrop', 'Escape', 'selection'] as const) {
    test(`Material drawer slides sideways before disappearing after ${dismiss} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.goto('/material#material-drawer')
      await waitForPageLayout(page)
      const card = page.locator('#material-drawer')
      const host = card.locator('m-drawer')
      const dialog = host.locator('dialog')
      const container = host.locator('[part="sheet"]')
      const opener = card.getByRole('button', { name: '打开导航抽屉', exact: true })
      await opener.click()
      await expect(dialog).toHaveJSProperty('open', true)
      await dialog.evaluate(async element => {
        await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})))
      })
      const initial = await container.boundingBox()
      expect(initial).not.toBeNull()
      const entryMotion = await container.evaluate(element => ({
        duration: parseFloat(getComputedStyle(element).transitionDuration) * 1000,
        easing: getComputedStyle(element).transitionTimingFunction,
      }))
      if (dismiss === 'backdrop') await page.mouse.click(page.viewportSize()!.width - 20, 120)
      else if (dismiss === 'Escape') await page.keyboard.press('Escape')
      else await card.getByRole('button', { name: '收藏', exact: true }).click()

      const exit = await dialog.evaluate(element => {
        const animations = element.getAnimations({ subtree: true })
        const panel = element.querySelector<HTMLElement>('[part="sheet"]')!
        const motion = animations.find(animation =>
          animation instanceof CSSTransition && animation.transitionProperty === 'transform' &&
          (animation.effect as KeyframeEffect).target === panel)
        // Inspect a stable frame while both the surface and backdrop animate.
        for (const animation of animations) {
          animation.pause()
          animation.currentTime = 60
        }
        return {
          open: (element as HTMLDialogElement).open,
          display: getComputedStyle(element).display,
          overlay: getComputedStyle(element).getPropertyValue('overlay'),
          left: panel.getBoundingClientRect().left,
          right: panel.getBoundingClientRect().right,
          opacity: Number(getComputedStyle(element, '::backdrop').opacity),
          animated: !!motion,
          duration: Number(motion?.effect?.getTiming().duration),
          easing: getComputedStyle(panel).transitionTimingFunction,
        }
      })
      expect(exit.open).toBe(false)
      expect(exit.animated).toBe(true)
      expect(exit.duration).toBe(entryMotion.duration)
      expect(exit.easing).toBe(entryMotion.easing)
      expect(exit.display).toBe('flex')
      expect(exit.overlay).toBe('auto')
      expect(exit.left).toBeLessThan(initial!.x - 1)
      expect(exit.right).toBeGreaterThan(0)
      expect(exit.right).toBeLessThan(initial!.width)
      expect(exit.opacity).toBeGreaterThan(0)
      expect(exit.opacity).toBeLessThan(1)
      await dialog.evaluate(element => {
        element.getAnimations({ subtree: true }).forEach(animation => animation.finish())
      })
      await expect(dialog).toHaveCSS('display', 'none')
      await expect(dialog).toBeHidden()
      await expect(opener).toBeFocused()
      await opener.click()
      await expect(dialog).toHaveJSProperty('open', true)
    })
  }
}

test('Material drawer can reopen during its exit and releases the layer on navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('link', { name: 'Material', exact: true }).click()
  await waitForPageLayout(page)
  const host = page.locator('#material-drawer m-drawer')
  const dialog = host.locator('dialog')
  const opener = page.locator('#material-drawer').getByRole('button', { name: '打开导航抽屉', exact: true })
  await opener.click()
  await dialog.evaluate(async element => {
    await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})))
  })
  await page.mouse.click(page.viewportSize()!.width - 20, 120)
  await dialog.evaluate(element => {
    element.getAnimations({ subtree: true }).forEach(animation => {
      animation.pause()
      animation.currentTime = 60
    })
  })
  await expect(dialog).toHaveJSProperty('open', false)
  await expect(dialog).toHaveCSS('display', 'flex')
  await opener.click()
  await expect(dialog).toHaveJSProperty('open', true)
  await dialog.evaluate(async element => {
    await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})))
  })
  await expect(host.locator('[part="sheet"]')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
  await page.keyboard.press('Escape')
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('m-drawer')).toHaveCount(0)
  await page.getByRole('link', { name: '浏览全部组件', exact: true }).click()
  await expect(page).toHaveURL(/\/components$/)
})

test('Material drawer closes immediately with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/material#material-drawer')
  await waitForPageLayout(page)
  const card = page.locator('#material-drawer')
  const dialog = card.locator('m-drawer').locator('dialog')
  await card.getByRole('button', { name: '打开导航抽屉', exact: true }).click()
  await expect(dialog).toHaveJSProperty('open', true)
  await page.mouse.click(page.viewportSize()!.width - 20, 120)
  await expect(dialog).toHaveJSProperty('open', false)
  await expect(dialog).toHaveCSS('display', 'none')
  expect(await dialog.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
})
