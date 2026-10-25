import { expect, test } from '@playwright/test'
import { waitForPageLayout } from './component-navigation'

for (const width of [390, 1470]) {
  for (const dismiss of ['backdrop', 'Escape', 'close', 'action'] as const) {
    test(`Material side sheet slides sideways before disappearing after ${dismiss} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.goto('/material#material-side-sheet')
      await waitForPageLayout(page)
      const card = page.locator('#material-side-sheet')
      const host = card.locator('m-side-sheet')
      const dialog = host.locator('dialog')
      const container = host.locator('[part="container"]')
      const opener = card.getByRole('button', { name: '打开侧边面板', exact: true })
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
      if (dismiss === 'backdrop') await page.mouse.click(20, 120)
      else if (dismiss === 'Escape') await page.keyboard.press('Escape')
      else if (dismiss === 'close') await card.getByRole('button', { name: 'Close', exact: true }).click()
      else await card.getByRole('button', { name: '完成', exact: true }).click()

      const exit = await dialog.evaluate(element => {
        const animations = element.getAnimations({ subtree: true })
        const motion = animations.find(animation =>
          animation instanceof CSSTransition && animation.transitionProperty === 'transform')
        // Inspect a stable frame while both the surface and backdrop animate.
        for (const animation of animations) {
          animation.pause()
          animation.currentTime = 60
        }
        const panel = element.querySelector<HTMLElement>('[part="container"]')!
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
      expect(exit.left).toBeGreaterThan(initial!.x + 1)
      expect(exit.left).toBeLessThan(width)
      expect(exit.right).toBeGreaterThan(width)
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

test('Material side sheet can reopen during its exit and releases the layer on navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('link', { name: 'Material', exact: true }).click()
  await waitForPageLayout(page)
  const host = page.locator('#material-side-sheet m-side-sheet')
  const dialog = host.locator('dialog')
  const opener = page.locator('#material-side-sheet').getByRole('button', { name: '打开侧边面板', exact: true })
  await opener.click()
  await dialog.evaluate(async element => {
    await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})))
  })
  await page.mouse.click(20, 120)
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
  await expect(host.locator('[part="container"]')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
  await page.keyboard.press('Escape')
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('m-side-sheet')).toHaveCount(0)
  await page.getByRole('link', { name: '浏览全部组件', exact: true }).click()
  await expect(page).toHaveURL(/\/components$/)
})

test('Material side sheet closes immediately with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/material#material-side-sheet')
  await waitForPageLayout(page)
  const card = page.locator('#material-side-sheet')
  const dialog = card.locator('m-side-sheet').locator('dialog')
  await card.getByRole('button', { name: '打开侧边面板', exact: true }).click()
  await expect(dialog).toHaveJSProperty('open', true)
  await page.mouse.click(20, 120)
  await expect(dialog).toHaveJSProperty('open', false)
  await expect(dialog).toHaveCSS('display', 'none')
  expect(await dialog.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
})
