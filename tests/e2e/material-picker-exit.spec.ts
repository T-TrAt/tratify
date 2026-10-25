import { expect, test } from '@playwright/test'
import { waitForPageLayout } from './component-navigation'

for (const picker of ['timepicker', 'datepicker']) {
  test(`Material ${picker} keeps partially revealed text stable when dismissed during entry`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(`/material#material-${picker}`)
    await waitForPageLayout(page)
    const card = page.locator(`#material-${picker}`)
    const dialog = card.locator(`m-${picker}`).locator('dialog')
    const name = picker === 'timepicker' ? '选择预约时间' : /^(Choose date|Change date,)/
    await card.getByRole('button', { name }).click()
    const selector = picker === 'timepicker'
      ? '.mtrl-time-picker__title, .mtrl-time-picker__content, .mtrl-time-picker__actions'
      : '.mtrl-datepicker__content > *'
    const before = await dialog.evaluate((element, selector) => {
      element.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = 175 })
      return Array.from(element.querySelectorAll(selector)).map(part => Number(getComputedStyle(part).opacity))
    }, selector)
    expect(before.some(value => value > 0 && value < 1)).toBe(true)
    await page.keyboard.press('Escape')
    const after = await dialog.evaluate((element, selector) => {
      element.getAnimations({ subtree: true }).forEach(animation => animation.pause())
      return Array.from(element.querySelectorAll(selector)).map(part => Number(getComputedStyle(part).opacity))
    }, selector)
    expect(after).toHaveLength(before.length)
    after.forEach((value, index) => expect(value).toBeCloseTo(before[index]!, 2))
    await dialog.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.finish()))
    await expect(dialog).toHaveCSS('display', 'none')
  })
}
