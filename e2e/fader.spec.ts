import { test, expect } from '@playwright/test'

test.describe('Fader component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('.fader-wrap')).toHaveCount(2)
  })

  test.describe('rendering', () => {
    test('renders L VOL and R VOL faders', async ({ page }) => {
      await expect(page.locator('.fader-label').filter({ hasText: 'L VOL' })).toBeVisible()
      await expect(page.locator('.fader-label').filter({ hasText: 'R VOL' })).toBeVisible()
    })

    test('each fader has 20 segments', async ({ page }) => {
      for (let i = 0; i < 2; i++) {
        const fader = page.locator('.fader-wrap').nth(i)
        await expect(fader.locator('.seg')).toHaveCount(20)
      }
    })

    test('fader value display shows a number between 0 and 100', async ({ page }) => {
      for (let i = 0; i < 2; i++) {
        const fader = page.locator('.fader-wrap').nth(i)
        const text = await fader.locator('.fader-value').textContent()
        const val = Number(text)
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(100)
      }
    })

    test('fader thumb is visible inside track', async ({ page }) => {
      const fader = page.locator('.fader-wrap').first()
      const thumb = fader.locator('.thumb')
      const track = fader.locator('.fader-track')
      await expect(thumb).toBeVisible()
      await expect(track).toBeVisible()
    })
  })

  test.describe('click interaction', () => {
    test('clicking near the top of the track sets a high value', async ({ page }) => {
      const fader = page.locator('.fader-wrap').first()
      const track = fader.locator('.fader-track')
      const box = await track.boundingBox()
      if (!box) throw new Error('Track has no bounding box')

      await page.mouse.click(box.x + box.width / 2, box.y + 4)

      const value = Number(await fader.locator('.fader-value').textContent())
      expect(value).toBeGreaterThan(90)
    })

    test('clicking near the bottom of the track sets a low value', async ({ page }) => {
      const fader = page.locator('.fader-wrap').first()
      const track = fader.locator('.fader-track')
      const box = await track.boundingBox()
      if (!box) throw new Error('Track has no bounding box')

      await page.mouse.click(box.x + box.width / 2, box.y + box.height - 4)

      const value = Number(await fader.locator('.fader-value').textContent())
      expect(value).toBeLessThan(10)
    })

    test('clicking the middle of the track sets a value near 50%', async ({ page }) => {
      const fader = page.locator('.fader-wrap').first()
      const track = fader.locator('.fader-track')
      const box = await track.boundingBox()
      if (!box) throw new Error('Track has no bounding box')

      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

      const value = Number(await fader.locator('.fader-value').textContent())
      expect(value).toBeGreaterThanOrEqual(40)
      expect(value).toBeLessThanOrEqual(60)
    })
  })

  test.describe('scroll wheel interaction', () => {
    test('scrolling up increases value by 2%', async ({ page }) => {
      const fader = page.locator('.fader-wrap').first()
      const track = fader.locator('.fader-track')
      const box = await track.boundingBox()
      if (!box) throw new Error('Track has no bounding box')

      // Set to mid-range first
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      const before = Number(await fader.locator('.fader-value').textContent())

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.wheel(0, -100)

      const after = Number(await fader.locator('.fader-value').textContent())
      expect(after).toBe(before + 2)
    })

    test('scrolling down decreases value by 2%', async ({ page }) => {
      const fader = page.locator('.fader-wrap').first()
      const track = fader.locator('.fader-track')
      const box = await track.boundingBox()
      if (!box) throw new Error('Track has no bounding box')

      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      const before = Number(await fader.locator('.fader-value').textContent())

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.wheel(0, 100)

      const after = Number(await fader.locator('.fader-value').textContent())
      expect(after).toBe(before - 2)
    })

    test('value cannot be scrolled above 100%', async ({ page }) => {
      const fader = page.locator('.fader-wrap').first()
      const track = fader.locator('.fader-track')
      const box = await track.boundingBox()
      if (!box) throw new Error('Track has no bounding box')

      // Click to top, then over-scroll up
      await page.mouse.click(box.x + box.width / 2, box.y + 2)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -100)

      const value = Number(await fader.locator('.fader-value').textContent())
      expect(value).toBe(100)
    })

    test('value cannot be scrolled below 0%', async ({ page }) => {
      const fader = page.locator('.fader-wrap').first()
      const track = fader.locator('.fader-track')
      const box = await track.boundingBox()
      if (!box) throw new Error('Track has no bounding box')

      // Click to bottom, then over-scroll down
      await page.mouse.click(box.x + box.width / 2, box.y + box.height - 2)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      for (let i = 0; i < 10; i++) await page.mouse.wheel(0, 100)

      const value = Number(await fader.locator('.fader-value').textContent())
      expect(value).toBe(0)
    })
  })

  test.describe('thumb and segment feedback', () => {
    test('thumb sits higher on the track when value is high', async ({ page }) => {
      const fader = page.locator('.fader-wrap').first()
      const track = fader.locator('.fader-track')
      const thumb = fader.locator('.thumb')
      const box = await track.boundingBox()
      if (!box) throw new Error('Track has no bounding box')

      await page.mouse.click(box.x + box.width / 2, box.y + 4)
      const highBox = await thumb.boundingBox()

      await page.mouse.click(box.x + box.width / 2, box.y + box.height - 4)
      const lowBox = await thumb.boundingBox()

      if (!highBox || !lowBox) throw new Error('Thumb has no bounding box')
      expect(highBox.y).toBeLessThan(lowBox.y)
    })

    test('more segments are lit when value is higher', async ({ page }) => {
      const fader = page.locator('.fader-wrap').first()
      const track = fader.locator('.fader-track')
      const box = await track.boundingBox()
      if (!box) throw new Error('Track has no bounding box')

      // Low value
      await page.mouse.click(box.x + box.width / 2, box.y + box.height - 4)
      const lowLit = await page.evaluate(() =>
        document.querySelectorAll('.fader-wrap:first-child .seg[style*="background"]').length
      )

      // High value
      await page.mouse.click(box.x + box.width / 2, box.y + 4)
      const highLit = await page.evaluate(() =>
        document.querySelectorAll('.fader-wrap:first-child .seg[style*="background"]').length
      )

      expect(highLit).toBeGreaterThan(lowLit)
    })

    test('all 20 segments are lit at 100%', async ({ page }) => {
      const fader = page.locator('.fader-wrap').first()
      const track = fader.locator('.fader-track')
      const box = await track.boundingBox()
      if (!box) throw new Error('Track has no bounding box')

      await page.mouse.click(box.x + box.width / 2, box.y)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -100)

      await expect(fader.locator('.fader-value')).toContainText('100')

      const litCount = await page.evaluate(() =>
        document.querySelector('.fader-wrap')!.querySelectorAll('.seg[style*="background"]').length
      )
      expect(litCount).toBe(20)
    })

    test('no segments are lit at 0%', async ({ page }) => {
      const fader = page.locator('.fader-wrap').first()
      const track = fader.locator('.fader-track')
      const box = await track.boundingBox()
      if (!box) throw new Error('Track has no bounding box')

      await page.mouse.click(box.x + box.width / 2, box.y + box.height - 2)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      for (let i = 0; i < 60; i++) await page.mouse.wheel(0, 100)

      await expect(fader.locator('.fader-value')).toContainText('0')

      const litCount = await page.evaluate(() =>
        document.querySelector('.fader-wrap')!.querySelectorAll('.seg[style*="background"]').length
      )
      expect(litCount).toBe(0)
    })
  })

  test.describe('GROUP link', () => {
    test('GROUP button is visible and off by default', async ({ page }) => {
      const linkBtn = page.locator('.link-btn')
      await expect(linkBtn).toBeVisible()
      await expect(linkBtn).not.toHaveClass(/on/)
    })

    test('GROUP button toggles on and off', async ({ page }) => {
      const linkBtn = page.locator('.link-btn')
      await linkBtn.click()
      await expect(linkBtn).toHaveClass(/on/)
      await linkBtn.click()
      await expect(linkBtn).not.toHaveClass(/on/)
    })

    test('when GROUP is on, moving L fader also moves R fader', async ({ page }) => {
      await page.locator('.link-btn').click()

      const leftFader = page.locator('.fader-wrap').first()
      const leftTrack = leftFader.locator('.fader-track')
      const leftBox = await leftTrack.boundingBox()
      if (!leftBox) throw new Error('Left track has no bounding box')

      await page.mouse.click(leftBox.x + leftBox.width / 2, leftBox.y + 4)

      const leftVal = Number(await leftFader.locator('.fader-value').textContent())
      const rightVal = Number(await page.locator('.fader-wrap').nth(1).locator('.fader-value').textContent())

      expect(leftVal).toBeGreaterThan(90)
      expect(rightVal).toBe(leftVal)
    })

    test('when GROUP is off, L and R faders move independently', async ({ page }) => {
      await expect(page.locator('.link-btn')).not.toHaveClass(/on/)

      const leftFader = page.locator('.fader-wrap').first()
      const rightFader = page.locator('.fader-wrap').nth(1)

      const leftTrack = leftFader.locator('.fader-track')
      const leftBox = await leftTrack.boundingBox()
      if (!leftBox) throw new Error('Left track has no bounding box')
      await page.mouse.click(leftBox.x + leftBox.width / 2, leftBox.y + 4)

      const rightTrack = rightFader.locator('.fader-track')
      const rightBox = await rightTrack.boundingBox()
      if (!rightBox) throw new Error('Right track has no bounding box')
      await page.mouse.click(rightBox.x + rightBox.width / 2, rightBox.y + rightBox.height - 4)

      const leftVal = Number(await leftFader.locator('.fader-value').textContent())
      const rightVal = Number(await rightFader.locator('.fader-value').textContent())

      expect(leftVal).toBeGreaterThan(90)
      expect(rightVal).toBeLessThan(10)
    })
  })

  test('screenshot of fader row', async ({ page }) => {
    const row = page.locator('.fader-row')
    await row.screenshot({ path: 'test-results/fader-row.png' })
  })
})
