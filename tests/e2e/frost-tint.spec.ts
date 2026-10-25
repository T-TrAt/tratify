import { expect, test } from '@playwright/test'

test('frost direction and tint region stay independent and are remembered for each texture', async ({ page }) => {
  await page.goto('/tags')
  await page.getByText('磨砂玻璃', { exact: true }).click()
  const tintOptions = page.getByRole('radiogroup', { name: '底色区域', exact: true })
  const blur = page.locator('.hero-tag .texture-tag__frost')
  const tint = page.locator('.hero-tag .texture-tag__tint')
  await expect(tint).toHaveCSS('mask-image', /data:image\/svg\+xml/)
  await expect(tintOptions.getByRole('radio', { name: '背景', exact: true })).toBeChecked()
  await expect(page.getByRole('switch', { name: '背景磨砂', exact: true })).not.toBeChecked()
  await expect(page.locator('.hero-tag .texture-tag')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  const backgroundTint = await tint.evaluate(el => getComputedStyle(el).maskImage)
  const backgroundBlur = await blur.evaluate(el => getComputedStyle(el).maskImage)
  await tintOptions.getByText('纹理', { exact: true }).click()
  await expect.poll(() => tint.evaluate(el => getComputedStyle(el).maskImage)).not.toBe(backgroundTint)
  await expect(blur).toHaveCSS('mask-image', backgroundBlur)
  const textureTint = await tint.evaluate(el => getComputedStyle(el).maskImage)
  await page.getByRole('switch', { name: '背景磨砂', exact: true }).click()
  await expect(page.getByRole('switch', { name: '纹理磨砂', exact: true })).toBeChecked()
  await expect.poll(() => blur.evaluate(el => getComputedStyle(el).maskImage)).not.toBe(backgroundBlur)
  await expect(tint).toHaveCSS('mask-image', textureTint)
  await page.getByRole('slider', { name: '纹理反差', exact: true }).press('End')
  await page.getByRole('slider', { name: '磨砂强度', exact: true }).press('End')
  await expect(tint).toHaveCSS('mask-image', textureTint)

  await page.getByRole('button', { name: '使用 Batthern', exact: true }).click()
  await page.getByText('磨砂玻璃', { exact: true }).click()
  await expect(tintOptions.getByRole('radio', { name: '背景', exact: true })).toBeChecked()
  await expect(page.getByRole('switch', { name: '背景磨砂', exact: true })).not.toBeChecked()
  await page.getByRole('button', { name: '使用 Arabesque', exact: true }).click()
  await expect(tintOptions.getByRole('radio', { name: '纹理', exact: true })).toBeChecked()
  await expect(page.getByRole('switch', { name: '纹理磨砂', exact: true })).toBeChecked()
  await page.reload()
  await expect(tintOptions.getByRole('radio', { name: '纹理', exact: true })).toBeChecked()
  await expect(page.getByRole('switch', { name: '纹理磨砂', exact: true })).toBeChecked()
  await expect(tint).toHaveCSS('mask-image', textureTint)
  await page.getByRole('button', { name: '重置', exact: true }).click()
  await expect(tintOptions.getByRole('radio', { name: '背景', exact: true })).toBeChecked()
  await expect(page.getByRole('switch', { name: '背景磨砂', exact: true })).not.toBeChecked()
})

test('painted tint affects only the chosen half of a synthetic texture and preserves clear corners', async ({ page }) => {
  await page.goto('/tags')
  await page.getByText('磨砂玻璃', { exact: true }).click()
  await expect(page.locator('.hero-tag .texture-tag__tint')).toHaveCSS('mask-image', /data:image\/svg\+xml/)
  const masks = await page.evaluate(async () => {
    const modulePath = '/playground/frost-texture.ts'
    const { createFrostMask, frostMaskPattern } = await import(/* @vite-ignore */ modulePath)
    const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 100
    const context = canvas.getContext('2d')!; context.fillStyle = '#000'; context.fillRect(0, 0, 100, 100)
    const source = new Image(); source.src = canvas.toDataURL(); await source.decode()
    const background = `url("${frostMaskPattern(createFrostMask(source, 100), 200, 100, 0)}")`
    const texture = `url("${frostMaskPattern(createFrostMask(source, 100, true), 200, 100, 0)}")`
    const host = document.createElement('div'); host.id = 'frost-tint-paint-probe'
    host.style.cssText = 'position:fixed;left:0;top:80px;width:240px;height:140px;z-index:9999;background:#fff;padding:20px;box-sizing:border-box'
    const tag = document.querySelector('.hero-tag .texture-tag')!.cloneNode(true) as HTMLElement
    tag.style.cssText += ';width:200px;height:100px;padding:0;border:0;min-height:0;box-shadow:none;--texture-background:#ff0000;--texture-radius:28px;--frost-tint:80%;--frost-blur:0px;--frost-mask:none;--texture-angle:0deg'
    tag.style.setProperty('--frost-tint-mask', background)
    tag.querySelectorAll('.texture-tag__label,button').forEach(element => element.remove())
    host.append(tag); document.body.append(host)
    return { background, texture }
  })
  const probe = page.locator('#frost-tint-paint-probe')
  const tag = probe.locator('.texture-tag')
  async function colors() {
    const png = await probe.screenshot()
    return page.evaluate(async data => {
      const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
      const pixel = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data]
      return { mark: pixel(70, 70), blank: pixel(170, 70), corners: [pixel(23, 23), pixel(216, 23), pixel(23, 116), pixel(216, 116)] }
    }, png.toString('base64'))
  }
  const background = await colors()
  expect(background.mark.slice(0, 3)).toEqual([255, 255, 255])
  expect(background.blank[0]).toBeGreaterThan(245)
  expect(background.blank[1]).toBeLessThan(80)
  expect(background.blank[2]).toBeLessThan(80)
  for (const corner of background.corners) expect(corner.slice(0, 3)).toEqual([255, 255, 255])
  await tag.evaluate((element, mask) => (element as HTMLElement).style.setProperty('--frost-tint-mask', mask), masks.texture)
  const texture = await colors()
  expect(texture.blank.slice(0, 3)).toEqual([255, 255, 255])
  expect(texture.mark[0]).toBeGreaterThan(245)
  expect(texture.mark[1]).toBeLessThan(80)
  expect(texture.mark[2]).toBeLessThan(80)
  for (const corner of texture.corners) expect(corner.slice(0, 3)).toEqual([255, 255, 255])
})
