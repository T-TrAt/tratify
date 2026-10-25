import { expect, test } from '@playwright/test'
import { waitForPageLayout } from './component-navigation'

for (const width of [390, 1470]) {
  for (const direction of ['ltr', 'rtl'] as const) {
    test(`Material carousel keeps compressed images visible during ${direction} dragging at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.goto('/material#material-carousel')
      await waitForPageLayout(page)
      const carousel = page.locator('#material-carousel m-carousel')
      await carousel.evaluate((host, dir) => host.setAttribute('dir', dir), direction)
      await carousel.scrollIntoViewIfNeeded()
      const scroller = carousel.locator('[part="scroller"]')
      await expect(scroller).toHaveCSS('direction', direction)
      const geometry = await carousel.evaluate(async host => {
        const shadow = host.shadowRoot!
        await Promise.all(Array.from(shadow.querySelectorAll('img')).map(image => image.decode()))
        const item = shadow.querySelector<HTMLElement>('[part="item"]')!
        const box = item.getBoundingClientRect()
        const inset = Number(getComputedStyle(item).clipPath.match(/inset\([^ ]+ ([\d.]+)px/)?.[1] ?? 0)
        const snap = shadow.querySelectorAll<HTMLElement>('[part="snap"]')[1]!
        const dir = getComputedStyle(item).direction
        return {
          x: dir === 'rtl' ? box.left + inset + 20 : box.right - inset - 20,
          y: box.top + box.height / 2,
          distance: parseFloat(dir === 'rtl' ? snap.style.right : snap.style.left),
        }
      })
      const sign = direction === 'rtl' ? 1 : -1
      const probe = await page.evaluateHandle(() => {
        const node = document.createElement('div')
        node.hidden = true
        document.body.append(node)
        return node
      })
      await page.mouse.move(geometry.x, geometry.y)
      await page.mouse.down()
      const widths: number[] = []
      try {
        for (let step = 1; step <= 50; step++) {
          const distance = geometry.distance * step / 50
          await page.mouse.move(geometry.x + sign * distance, geometry.y)
          // Scrollbars and other components may write dir during a Vue update.
          await probe.evaluate((node, step) => node.setAttribute('dir', step % 2 ? 'ltr' : 'rtl'), step)
          const frame = await carousel.evaluate(async host => {
            await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
            const shadow = host.shadowRoot!
            const scroller = shadow.querySelector<HTMLElement>('[part="scroller"]')!
            const item = shadow.querySelector<HTMLElement>('[part="item"]')!
            const bounds = item.getBoundingClientRect()
            const viewport = scroller.getBoundingClientRect()
            const inset = Number(getComputedStyle(item).clipPath.match(/inset\([^ ]+ ([\d.]+)px/)?.[1] ?? 0)
            const left = Math.max(viewport.left, bounds.left + inset)
            const right = Math.min(viewport.right, bounds.right - inset)
            return {
              position: Math.abs(scroller.scrollLeft),
              width: Math.max(0, right - left),
              painted: shadow.elementFromPoint((left + right) / 2, bounds.top + bounds.height / 2) === item,
            }
          })
          expect(Math.abs(frame.position - distance), `drag step ${step} must follow the pointer`).toBeLessThanOrEqual(1)
          if (frame.width > 1) expect(frame.painted, `visible image at step ${step} must remain painted`).toBe(true)
          if (widths.length) {
            const previous = widths.at(-1)!
            expect(frame.width).toBeLessThanOrEqual(previous + 1)
            expect(previous - frame.width, `image must shrink continuously at step ${step}`).toBeLessThan(geometry.distance / 25 + 2)
          }
          widths.push(frame.width)
        }
        expect(widths.some(value => value > 1 && value < 10)).toBe(true)
        expect(widths.at(-1)).toBeLessThanOrEqual(1)
        await expect(page.locator('#material-carousel output')).toHaveText('2 / 3')
      } finally {
        await page.mouse.up()
        await probe.evaluate(node => node.remove())
      }
    })
  }
}

test('Material carousel still responds to inherited direction changes and keyboard navigation', async ({ page }) => {
  await page.goto('/material#material-carousel')
  await waitForPageLayout(page)
  const card = page.locator('#material-carousel')
  const carousel = card.locator('m-carousel')
  await card.evaluate(element => element.setAttribute('dir', 'rtl'))
  await expect(carousel.locator('[part="scroller"]')).toHaveCSS('direction', 'rtl')
  await expect(carousel.locator('[part="item"]').first()).toHaveCSS('right', '0px')
  await carousel.locator('[part="item"]').first().focus()
  await page.keyboard.press('ArrowLeft')
  await expect(card.locator('output')).toHaveText('2 / 3')
  await card.evaluate(element => element.setAttribute('dir', 'ltr'))
  await expect(carousel.locator('[part="item"]').first()).toHaveCSS('left', '0px')
  await page.keyboard.press('ArrowRight')
  await expect(card.locator('output')).toHaveText('3 / 3')
})
