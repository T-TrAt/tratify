import { expect, test, type Locator } from '@playwright/test'
import { waitForPageLayout } from './component-navigation'

for (const width of [390, 1470]) {
  for (const dismiss of ['backdrop', 'Escape', 'Cancel', 'OK'] as const) {
    test(`Material timepicker fades its backdrop and animates ${dismiss} dismissal at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.goto('/material#material-timepicker')
      await waitForPageLayout(page)
      const card = page.locator('#material-timepicker')
      const dialog = card.locator('m-timepicker').locator('dialog')
      const opener = card.getByRole('button', { name: '选择预约时间', exact: true })
      await opener.click()
      const entry = await dialog.evaluate(element => {
        const animations = element.getAnimations({ subtree: true })
        const backdrop = animations.some(animation => animation instanceof CSSTransition &&
          animation.transitionProperty === 'background-color' && (animation.effect as KeyframeEffect).pseudoElement === '::backdrop')
        animations.forEach(animation => { animation.pause(); animation.currentTime = 60 })
        const style = getComputedStyle(element)
        const matrix = new DOMMatrixReadOnly(style.transform)
        const color = getComputedStyle(element, '::backdrop').backgroundColor
        return { backdrop, opacity: Number(style.opacity), scrim: Number(color.match(/[,/]\s*([\d.]+)\)$/)?.[1] ?? 0), scaleX: matrix.a, scaleY: matrix.d, y: matrix.f }
      })
      expect(entry.backdrop).toBe(true)
      expect(entry.scrim).toBeGreaterThan(0)
      expect(entry.scrim).toBeLessThan(0.32)
      expect(entry.opacity).toBe(1)
      expect(entry.scaleX).toBe(1)
      expect(entry.scaleY).toBeGreaterThan(0.35)
      expect(entry.scaleY).toBeLessThan(1)
      expect(entry.y).toBeLessThan(0)
      await dialog.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.finish()))
      await dialog.getByRole('spinbutton', { name: 'Hour', exact: true }).fill('14')
      await dialog.getByRole('spinbutton', { name: 'Minute', exact: true }).fill('45')
      if (dismiss === 'backdrop') await page.mouse.click(20, 880)
      else if (dismiss === 'Escape') await page.keyboard.press('Escape')
      else await dialog.getByRole('button', { name: dismiss, exact: true }).click()

      const exit = await dialog.evaluate(element => {
        const animations = element.getAnimations({ subtree: true })
        const motion = animations.find(animation => animation instanceof CSSTransition && animation.transitionProperty === 'transform')
        const contents = Array.from(element.querySelectorAll('.mtrl-time-picker__title, .mtrl-time-picker__content, .mtrl-time-picker__actions'))
        const contentFrames = [0, 25, 75, 100, 125, 145].map(time => {
          animations.forEach(animation => { animation.pause(); animation.currentTime = time })
          return contents.map(part => Number(getComputedStyle(part).opacity))
        })
        animations.forEach(animation => { animation.currentTime = 125 })
        const style = getComputedStyle(element)
        const matrix = new DOMMatrixReadOnly(style.transform)
        const color = getComputedStyle(element, '::backdrop').backgroundColor
        return {
          contentFrames,
          fields: Array.from(element.querySelectorAll<HTMLInputElement>('input[data-type]')).map(field => field.value),
          contentOpacity: Array.from(element.querySelectorAll('.mtrl-time-picker__title, .mtrl-time-picker__content, .mtrl-time-picker__actions')).map(part => Number(getComputedStyle(part).opacity)),
          animated: !!motion, open: (element as HTMLDialogElement).open,
          display: style.display, overlay: style.getPropertyValue('overlay'),
          opacity: Number(style.opacity), scrim: Number(color.match(/[,/]\s*([\d.]+)\)$/)?.[1] ?? 0), scaleX: matrix.a, scaleY: matrix.d, y: matrix.f,
        }
      })
      expect(exit.open).toBe(false)
      expect(exit.animated).toBe(true)
      expect(exit.fields).toEqual(['14', '45'])
      expect(exit.contentFrames.every(frame => frame.every(value => value === 1)), 'text must stay with the surface throughout exit').toBe(true)
      expect(exit.contentOpacity.length).toBeGreaterThan(0)
      expect(exit.contentOpacity.every(value => value === 1), 'text must remain visible with the exiting surface').toBe(true)
      expect(exit.display).toBe('flex')
      expect(exit.overlay).toBe('auto')
      expect(exit.scrim).toBeGreaterThan(0)
      expect(exit.scrim).toBeLessThan(0.32)
      expect(exit.opacity).toBeGreaterThan(0)
      expect(exit.opacity).toBeLessThan(1)
      expect(exit.scaleX).toBe(1)
      expect(exit.scaleY).toBeGreaterThan(0.35)
      expect(exit.scaleY).toBeLessThan(1)
      expect(exit.y).toBeLessThan(0)
      await dialog.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.finish()))
      await expect(dialog).toHaveCSS('display', 'none')
      await expect(opener).toBeFocused()
      await expect(card.locator('output')).toHaveText(dismiss === 'OK' ? '14:45' : '10:30')
      await opener.click()
      await expect(dialog.getByRole('spinbutton', { name: 'Hour', exact: true })).toHaveValue(dismiss === 'OK' ? '14' : '10')
      await expect(dialog.getByRole('spinbutton', { name: 'Minute', exact: true })).toHaveValue(dismiss === 'OK' ? '45' : '30')
    })
  }
}

const motionSnapshot = (dialog: Locator, prefix: string) => dialog.evaluate((element, prefix) => {
  const read = (style: CSSStyleDeclaration) => ({
    property: style.transitionProperty,
    duration: style.transitionDuration,
    easing: style.transitionTimingFunction,
    delay: style.transitionDelay,
  })
  const parts = prefix === 'mtrl-dialog' ? ['header', 'content', 'footer'] : ['title', 'content', 'actions']
  return {
    surface: read(getComputedStyle(element)),
    scrim: read(getComputedStyle(element, '::backdrop')),
    content: parts.map(part => read(getComputedStyle(element.querySelector(`.${prefix}__${part}`)!))),
  }
}, prefix)

for (const width of [390, 1470]) {
  test(`Material timepicker uses the dialog's surface motion and staggered entry timing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/material')
    await waitForPageLayout(page)
    const reference = page.locator('#material-dialog m-dialog').locator('dialog')
    await page.locator('#material-dialog').getByRole('button', { name: '打开对话框', exact: true }).click()
    await expect(reference).toHaveClass(/mtrl-dialog--visible/)
    const referenceEntry = await motionSnapshot(reference, 'mtrl-dialog')
    await reference.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.finish()))
    await page.keyboard.press('Escape')
    const referenceExit = await motionSnapshot(reference, 'mtrl-dialog')
    await reference.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.finish()))

    const card = page.locator('#material-timepicker')
    const picker = card.locator('m-timepicker').locator('dialog')
    await card.getByRole('button', { name: '选择预约时间', exact: true }).click()
    expect(await motionSnapshot(picker, 'mtrl-time-picker')).toEqual(referenceEntry)
    await picker.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.finish()))
    await page.keyboard.press('Escape')
    const pickerExit = await motionSnapshot(picker, 'mtrl-time-picker')
    expect(pickerExit.surface).toEqual(referenceExit.surface)
    expect(pickerExit.scrim).toEqual(referenceExit.scrim)
  })
}

test('Material timepicker can reopen during its exit and cleans up on navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('link', { name: 'Material', exact: true }).click()
  await waitForPageLayout(page)
  const card = page.locator('#material-timepicker')
  const dialog = card.locator('m-timepicker').locator('dialog')
  const opener = card.getByRole('button', { name: '选择预约时间', exact: true })
  await opener.click()
  await dialog.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.finish()))
  await page.keyboard.press('Escape')
  await dialog.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = 60 }))
  await expect(dialog).toHaveCSS('display', 'flex')
  await opener.click()
  await expect(dialog).toHaveJSProperty('open', true)
  await dialog.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.finish()))
  await expect(dialog).toHaveCSS('opacity', '1')
  await expect(dialog).toHaveCSS('transform', 'none')
  await page.keyboard.press('Escape')
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('m-timepicker')).toHaveCount(0)
  await page.getByRole('link', { name: '浏览全部组件', exact: true }).click()
  await expect(page).toHaveURL(/\/components$/)
})

test('Material timepicker opens and closes immediately with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/material#material-timepicker')
  await waitForPageLayout(page)
  const card = page.locator('#material-timepicker')
  const dialog = card.locator('m-timepicker').locator('dialog')
  await card.getByRole('button', { name: '选择预约时间', exact: true }).click()
  await expect(dialog).toHaveJSProperty('open', true)
  await expect(dialog).toHaveCSS('opacity', '1')
  expect(await dialog.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveJSProperty('open', false)
  await expect(dialog).toHaveCSS('display', 'none')
  expect(await dialog.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
})
