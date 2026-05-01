import { test, expect } from '@playwright/test'

test.describe('App shell', () => {
  test('shows logo and all tabs', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.logo')).toContainText('OISERATOR')
    await expect(page.getByRole('button', { name: /oscillator/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /noise/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /mix/i })).toBeVisible()
  })

  test('oscillator tab is active by default', async ({ page }) => {
    await page.goto('/')
    const oscTab = page.getByRole('button', { name: /oscillator/i })
    await expect(oscTab).toHaveClass(/active/)
    await expect(page.locator('.tagline')).toContainText('dual oscillator')
  })

  test('can switch to noise tab', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /noise/i }).click()
    const noiseTab = page.getByRole('button', { name: /noise/i })
    await expect(noiseTab).toHaveClass(/active/)
  })

  test('can switch back to oscillator tab', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /noise/i }).click()
    await page.getByRole('button', { name: /oscillator/i }).click()
    await expect(page.locator('.tagline')).toContainText('dual oscillator')
  })
})

test.describe('Oscillator view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders left and right channel panels', async ({ page }) => {
    await expect(page.locator('.ch-label').filter({ hasText: 'LEFT' })).toBeVisible()
    await expect(page.locator('.ch-label').filter({ hasText: 'RIGHT' })).toBeVisible()
  })

  test('shows power button with START label', async ({ page }) => {
    await expect(page.locator('.power-label')).toContainText('START')
  })

  test('power button toggles to RUNNING on click', async ({ page }) => {
    await page.locator('.power-btn').click()
    await expect(page.locator('.power-label')).toContainText('RUNNING')
    await expect(page.locator('.power-btn')).toHaveClass(/running/)
  })

  test('power button toggles back to START on second click', async ({ page }) => {
    await page.locator('.power-btn').click()
    await page.locator('.power-btn').click()
    await expect(page.locator('.power-label')).toContainText('START')
  })

  test('each channel has FREQ, VOL, and wave knobs', async ({ page }) => {
    const panels = page.locator('.channel-panel')
    for (let i = 0; i < 2; i++) {
      const panel = panels.nth(i)
      await expect(panel.locator('.knob-label', { hasText: 'FREQ' })).toBeVisible()
      await expect(panel.locator('.knob-label', { hasText: 'VOL' })).toBeVisible()
    }
  })

  test('channel toggle switches enabled state', async ({ page }) => {
    const toggle = page.locator('.ch-toggle').first()
    // Initially on
    await expect(toggle).toHaveClass(/on/)
    // Click to disable
    await toggle.click()
    await expect(toggle).not.toHaveClass(/on/)
    // Click to re-enable
    await toggle.click()
    await expect(toggle).toHaveClass(/on/)
  })

  test('phase invert button toggles', async ({ page }) => {
    const phaseBtn = page.locator('.phase-btn').first()
    await expect(phaseBtn).not.toHaveClass(/on/)
    await expect(phaseBtn.locator('.phase-deg')).toContainText('0°')
    await phaseBtn.click()
    await expect(phaseBtn).toHaveClass(/on/)
    await expect(phaseBtn.locator('.phase-deg')).toContainText('180°')
  })

  test('shows footer hint text', async ({ page }) => {
    await expect(page.locator('.footer')).toContainText('space = power')
  })
})


test.describe('Knob inline edit', () => {
  test.describe('Oscillator knobs', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
    })

    test('clicking FREQ value opens an input', async ({ page }) => {
      const leftPanel = page.locator('.channel-panel').first()
      const freqKnob = leftPanel.locator('.knob-wrap').first()
      const valueDisplay = freqKnob.locator('.knob-value')
      await valueDisplay.click()
      await expect(freqKnob.locator('.knob-input')).toBeVisible()
      await expect(freqKnob.locator('.knob-value')).not.toBeVisible()
    })

    test('typing a frequency and pressing Enter updates the value', async ({ page }) => {
      const leftPanel = page.locator('.channel-panel').first()
      const freqKnob = leftPanel.locator('.knob-wrap').first()
      await freqKnob.locator('.knob-value').click()
      const input = freqKnob.locator('.knob-input')
      await input.fill('1000')
      await input.press('Enter')
      // Input should close and display the new value
      await expect(freqKnob.locator('.knob-input')).not.toBeVisible()
      await expect(freqKnob.locator('.knob-value')).toContainText('1000')
    })

    test('typing a volume and pressing Enter updates the value', async ({ page }) => {
      const leftPanel = page.locator('.channel-panel').first()
      const volKnob = leftPanel.locator('.knob-wrap').nth(1)
      await volKnob.locator('.knob-value').click()
      const input = volKnob.locator('.knob-input')
      await input.fill('0.75')
      await input.press('Enter')
      await expect(volKnob.locator('.knob-value')).toContainText('0.75')
    })

    test('value is clamped to max', async ({ page }) => {
      const leftPanel = page.locator('.channel-panel').first()
      const freqKnob = leftPanel.locator('.knob-wrap').first()
      await freqKnob.locator('.knob-value').click()
      const input = freqKnob.locator('.knob-input')
      await input.fill('99999')
      await input.press('Enter')
      // Max frequency is 20000
      await expect(freqKnob.locator('.knob-value')).toContainText('20000')
    })

    test('value is clamped to min', async ({ page }) => {
      const leftPanel = page.locator('.channel-panel').first()
      const freqKnob = leftPanel.locator('.knob-wrap').first()
      await freqKnob.locator('.knob-value').click()
      const input = freqKnob.locator('.knob-input')
      await input.fill('5')
      await input.press('Enter')
      // Min frequency is 20
      await expect(freqKnob.locator('.knob-value')).toContainText('20')
    })

    test('Escape cancels edit without changing value', async ({ page }) => {
      const leftPanel = page.locator('.channel-panel').first()
      const freqKnob = leftPanel.locator('.knob-wrap').first()
      const originalValue = await freqKnob.locator('.knob-value').textContent()
      await freqKnob.locator('.knob-value').click()
      const input = freqKnob.locator('.knob-input')
      await input.fill('12345')
      await input.press('Escape')
      await expect(freqKnob.locator('.knob-input')).not.toBeVisible()
      await expect(freqKnob.locator('.knob-value')).toContainText(originalValue!.trim())
    })

    test('blur commits the edit', async ({ page }) => {
      const leftPanel = page.locator('.channel-panel').first()
      const freqKnob = leftPanel.locator('.knob-wrap').first()
      await freqKnob.locator('.knob-value').click()
      const input = freqKnob.locator('.knob-input')
      await input.fill('500')
      // Click elsewhere to blur
      await page.locator('.logo').click()
      await expect(freqKnob.locator('.knob-input')).not.toBeVisible()
      await expect(freqKnob.locator('.knob-value')).toContainText('500')
    })

    test('invalid input does not change value', async ({ page }) => {
      const leftPanel = page.locator('.channel-panel').first()
      const freqKnob = leftPanel.locator('.knob-wrap').first()
      const originalValue = await freqKnob.locator('.knob-value').textContent()
      await freqKnob.locator('.knob-value').click()
      const input = freqKnob.locator('.knob-input')
      await input.fill('abc')
      await input.press('Enter')
      await expect(freqKnob.locator('.knob-value')).toContainText(originalValue!.trim())
    })
  })


})
