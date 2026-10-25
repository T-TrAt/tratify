import { expect, test } from '@playwright/test'

test('frost parameters and material mode are remembered per texture, with shared comparison backgrounds', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/tags')
  await page.getByText('磨砂玻璃', { exact: true }).click()
  const frost = page.locator('.hero-tag .texture-tag__frost')
  await expect(frost).toHaveCSS('backdrop-filter', 'blur(18px)')
  await expect(frost).toHaveCSS('mask-image', /data:image\/svg\+xml/)
  await expect(page.getByLabel('磨砂对比')).toContainText('均匀磨砂')
  const originalMask = await frost.evaluate(el => getComputedStyle(el).maskImage)
  await page.getByRole('slider', { name: '纹理反差', exact: true }).press('End')
  await expect.poll(() => frost.evaluate(el => getComputedStyle(el).maskImage)).not.toBe(originalMask)
  await page.getByRole('slider', { name: '磨砂强度', exact: true }).press('End')
  await page.getByRole('slider', { name: '底色浓度', exact: true }).press('Home')
  await page.getByRole('slider', { name: '纹理旋转', exact: true }).press('End')
  await page.getByText('照片', { exact: true }).click()
  await expect(page.locator('.preview-stage')).toHaveAttribute('data-background', 'photo')
  await expect(page.locator('.preview-stage')).toHaveCSS('background-image', /lake\.jpg/)
  await page.getByRole('button', { name: '复制样式', exact: true }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('backdrop-filter: blur(32px)')
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('data:image/svg+xml,')
  expect(copied).toContain('border-radius: inherit')
  expect(copied).toContain('clip-path: inset(0 round 28px)')
  const maskUrl = copied.match(/mask-image: url\("(data:image\/svg\+xml,[^"]+)"\)/)![1]
  expect(decodeURIComponent(maskUrl)).toContain('rotate(180)')
  expect(copied).toContain('David Sanchez')
  expect(copied).toContain('CC BY 3.0')
  await page.getByRole('button', { name: '使用 Batthern', exact: true }).click()
  await expect(frost).toHaveCount(0)
  await page.getByText('磨砂玻璃', { exact: true }).click()
  await expect(frost).toHaveCSS('backdrop-filter', 'blur(18px)')
  await page.getByRole('button', { name: '使用 Arabesque', exact: true }).click()
  await expect(frost).toHaveCSS('backdrop-filter', 'blur(32px)')
  await expect(page.getByRole('slider', { name: '纹理反差', exact: true })).toHaveValue('200')
  await expect(page.getByRole('slider', { name: '底色浓度', exact: true })).toHaveValue('0')
  await page.reload()
  await expect(frost).toHaveCSS('backdrop-filter', 'blur(32px)')
  await expect(page.locator('.preview-stage')).toHaveAttribute('data-background', 'photo')
  await page.getByRole('button', { name: '重置', exact: true }).click()
  await expect(frost).toHaveCSS('backdrop-filter', 'blur(18px)')
  await expect(page.getByRole('radio', { name: '磨砂玻璃', exact: true })).toBeChecked()
  await page.locator('.hero-tag').getByRole('button', { name: '移除设计系统', exact: true }).click()
  await expect(frost).toHaveCount(0)
  await page.getByRole('button', { name: '重新添加标签', exact: true }).click()
  await expect(frost).toBeVisible()
})

test('all collected dark and light textures produce a nonempty frost mask without runtime errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/tags')
  const choices = page.getByRole('group', { name: '选择纹理', exact: true }).getByRole('button')
  await expect(choices).toHaveCount(24)
  for (const choice of await choices.all()) {
    await choice.click()
    await page.getByText('磨砂玻璃', { exact: true }).click()
    await expect(page.locator('.hero-tag .texture-tag__frost')).toHaveCSS('mask-image', /data:image\/svg\+xml/)
  }
  expect(errors).toEqual([])
})

for (const onTexture of [false, true]) {
test(`actual painted backdrop blurs ${onTexture ? 'texture marks' : 'empty regions'} and keeps the other region clear`, async ({ page }) => {
  await page.goto('/tags')
  await page.getByText('磨砂玻璃', { exact: true }).click()
  await expect(page.locator('.hero-tag .texture-tag__frost')).toBeVisible()
  // Clone the real component styles and use a two-region source to measure blur independently of a particular pattern.
  await page.evaluate(async onTexture => {
    const modulePath = '/playground/frost-texture.ts'
    const { createFrostMask, frostMaskPattern } = await import(/* @vite-ignore */ modulePath)
    const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 100
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 100, 100)
    const source = new Image(); source.src = canvas.toDataURL(); await source.decode()
    const host = document.createElement('div'); host.id = 'frost-paint-probe'
    host.style.cssText = 'position:fixed;left:0;top:80px;width:240px;height:140px;z-index:9999;background:repeating-linear-gradient(90deg,#000 0 4px,#fff 4px 8px);padding:20px;box-sizing:border-box'
    const tag = document.querySelector('.hero-tag .texture-tag')!.cloneNode(true) as HTMLElement
    tag.style.cssText += ';width:200px;height:100px;padding:0;border:0;border-radius:0;min-height:0;--frost-tint:0%;--frost-blur:12px;--frost-mask:url("' + frostMaskPattern(createFrostMask(source, 100, onTexture), 200, 100, 0) + '")'
    tag.querySelectorAll('.texture-tag__label,button').forEach(el => el.remove())
    host.append(tag); document.body.append(host)
  }, onTexture)
  const probe = page.locator('#frost-paint-probe')
  // Decode a browser screenshot to sample the actual composited pixels.
  await page.waitForTimeout(150)
  const png = await probe.screenshot()
  const contrast = await page.evaluate(async data => {
    const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0)
    function range(x: number) {
      const pixels = ctx.getImageData(x, 65, 40, 1).data
      const red = [...pixels].filter((_, i) => i % 4 === 0)
      return Math.max(...red) - Math.min(...red)
    }
    return { mark: range(45), blank: range(145) }
  }, png.toString('base64'))
  expect(onTexture ? contrast.blank : contrast.mark).toBeGreaterThan(200)
  expect(onTexture ? contrast.mark : contrast.blank).toBeLessThan(20)
})
}

test('frost and rotated texture layers are clipped to the live corner radius', async ({ page }) => {
  await page.goto('/tags')
  await page.getByText('磨砂玻璃', { exact: true }).click()
  await expect(page.locator('.hero-tag .texture-tag__frost')).toBeVisible()
  await page.evaluate(() => {
    const host = document.createElement('div'); host.id = 'rounded-frost-probe'
    host.style.cssText = 'position:fixed;left:0;top:80px;width:240px;height:140px;z-index:9999;background:repeating-linear-gradient(90deg,#000 0 4px,#fff 4px 8px);padding:20px;box-sizing:border-box'
    const tag = document.querySelector('.hero-tag .texture-tag')!.cloneNode(true) as HTMLElement
    tag.style.cssText += ';width:200px;height:100px;padding:0;border:0;min-height:0;box-shadow:none;--texture-radius:28px;--frost-tint:0%;--frost-blur:12px;--frost-mask:none;--texture-angle:45deg;--texture-opacity:1'
    tag.querySelectorAll('.texture-tag__label,button').forEach(el => el.remove())
    host.append(tag); document.body.append(host)
  })
  const probe = page.locator('#rounded-frost-probe')
  const tag = probe.locator('.texture-tag')
  async function paintedContrast() {
    const png = await probe.screenshot()
    return page.evaluate(async data => {
      const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0)
      function range(x: number, y: number, width: number) {
        const pixels = ctx.getImageData(x, y, width, 1).data
        const red = [...pixels].filter((_, i) => i % 4 === 0)
        return Math.max(...red) - Math.min(...red)
      }
      return { corners: [range(22, 23, 8), range(210, 23, 8), range(22, 116, 8), range(210, 116, 8)], center: range(90, 65, 40) }
    }, png.toString('base64'))
  }
  for (const material of ['frosted', 'texture']) {
    await tag.evaluate((el, material) => {
      el.classList.toggle('texture-tag--frosted', material === 'frosted')
      // The composited frost layer must clip itself even without its ancestor's overflow clip.
      ;(el as HTMLElement).style.overflow = material === 'frosted' ? 'visible' : 'hidden'
    }, material)
    await tag.evaluate(el => (el as HTMLElement).style.setProperty('--texture-radius', '28px'))
    const rounded = await paintedContrast()
    for (const corner of rounded.corners) expect(corner).toBeGreaterThan(240)
    if (material === 'frosted') expect(rounded.center).toBeLessThan(20)
    await tag.evaluate(el => (el as HTMLElement).style.setProperty('--texture-radius', '0px'))
    const square = await paintedContrast()
    for (const corner of square.corners) expect(corner).toBeLessThan(100)
  }
})

for (const width of [320, 768, 1440]) {
  test(`frosted material fits at ${width}px in both themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    for (const theme of ['light', 'dark']) {
      await page.addInitScript(theme => localStorage.setItem('apptify:preferences', JSON.stringify({ theme, motion: 'none' })), theme)
      await page.goto('/tags')
      await page.getByText('磨砂玻璃', { exact: true }).click()
      await expect(page.locator('.hero-tag .texture-tag__frost')).toHaveCSS('mask-image', /data:image\/svg\+xml/)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      await page.screenshot({ path: test.info().outputPath(`frost-${theme}-${width}.png`), fullPage: true })
    }
  })
}
