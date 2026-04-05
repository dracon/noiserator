import { test, expect } from '@playwright/test'

test.describe('App shell', () => {
  test('shows logo and both tabs', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.logo')).toContainText('OISERATOR')
    await expect(page.getByRole('button', { name: /oscillator/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /notch filter/i })).toBeVisible()
  })

  test('oscillator tab is active by default', async ({ page }) => {
    await page.goto('/')
    const oscTab = page.getByRole('button', { name: /oscillator/i })
    await expect(oscTab).toHaveClass(/active/)
    await expect(page.locator('.tagline')).toContainText('dual oscillator')
  })

  test('can switch to notch filter tab', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /notch filter/i }).click()
    const notchTab = page.getByRole('button', { name: /notch filter/i })
    await expect(notchTab).toHaveClass(/active/)
    await expect(page.locator('.tagline')).toContainText('notch filter')
  })

  test('can switch back to oscillator tab', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /notch filter/i }).click()
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

test.describe('Notch filter view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /notch filter/i }).click()
  })

  test('renders frequency chart', async ({ page }) => {
    await expect(page.locator('.chart-wrap')).toBeVisible()
  })

  test('shows source selector buttons', async ({ page }) => {
    await expect(page.locator('.source-btn').filter({ hasText: 'MICROPHONE' })).toBeVisible()
    await expect(page.locator('.source-btn').filter({ hasText: 'APP AUDIO' })).toBeVisible()
  })

  test('microphone source is selected by default', async ({ page }) => {
    const micBtn = page.locator('.source-btn').filter({ hasText: 'MICROPHONE' })
    await expect(micBtn).toHaveClass(/active/)
  })

  test('can switch to app audio source', async ({ page }) => {
    const appBtn = page.locator('.source-btn').filter({ hasText: 'APP AUDIO' })
    await appBtn.click()
    await expect(appBtn).toHaveClass(/active/)
    // Info box should appear
    await expect(page.locator('.info-box')).toBeVisible()
  })

  test('shows one notch band by default', async ({ page }) => {
    await expect(page.locator('.band-card')).toHaveCount(1)
    await expect(page.locator('.band-label')).toContainText('NOTCH')
  })

  test('add band button creates a new band', async ({ page }) => {
    await page.locator('.add-btn').click()
    await expect(page.locator('.band-card')).toHaveCount(2)
  })

  test('can add up to 6 bands', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.locator('.add-btn').click()
    }
    await expect(page.locator('.band-card')).toHaveCount(6)
    await expect(page.locator('.add-btn')).toBeDisabled()
  })

  test('remove button deletes a band', async ({ page }) => {
    await page.locator('.add-btn').click()
    await expect(page.locator('.band-card')).toHaveCount(2)
    await page.locator('.remove-btn').first().click()
    await expect(page.locator('.band-card')).toHaveCount(1)
  })

  test('remove button is disabled when only one band exists', async ({ page }) => {
    await expect(page.locator('.remove-btn')).toBeDisabled()
  })

  test('band toggle disables/enables band', async ({ page }) => {
    const toggle = page.locator('.band-toggle').first()
    await expect(toggle).toHaveClass(/on/)
    await toggle.click()
    await expect(toggle).not.toHaveClass(/on/)
    await expect(page.locator('.band-card').first()).toHaveClass(/disabled/)
  })

  test('each band has FREQ and Q knobs', async ({ page }) => {
    const band = page.locator('.band-card').first()
    await expect(band.locator('.knob-label', { hasText: 'FREQ' })).toBeVisible()
    await expect(band.locator('.knob-label').filter({ hasText: /^Q$/ })).toBeVisible()
  })

  test('band shows frequency and bandwidth readout', async ({ page }) => {
    await expect(page.locator('.readout-freq').first()).toBeVisible()
    await expect(page.locator('.readout-bw').first()).toContainText('BW')
  })

  test('start button text reflects source mode', async ({ page }) => {
    await expect(page.locator('.power-btn')).toContainText('START MIC')
    const appBtn = page.locator('.source-btn').filter({ hasText: 'APP AUDIO' })
    await appBtn.click()
    await expect(page.locator('.power-btn')).toContainText('START APP AUDIO')
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

  test.describe('Notch filter knobs', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: /notch filter/i }).click()
    })

    test('typing a frequency updates the band readout', async ({ page }) => {
      const band = page.locator('.band-card').first()
      const freqKnob = band.locator('.knob-wrap').first()
      await freqKnob.locator('.knob-value').click()
      const input = freqKnob.locator('.knob-input')
      await input.fill('8000')
      await input.press('Enter')
      await expect(freqKnob.locator('.knob-value')).toContainText('8000')
      await expect(band.locator('.readout-freq')).toContainText('8.00 kHz')
    })

    test('typing a Q value updates the band', async ({ page }) => {
      const band = page.locator('.band-card').first()
      const qKnob = band.locator('.knob-wrap').nth(1)
      await qKnob.locator('.knob-value').click()
      const input = qKnob.locator('.knob-input')
      await input.fill('50')
      await input.press('Enter')
      await expect(qKnob.locator('.knob-value')).toContainText('50.0')
    })

    test('Q value is clamped to range 1–200', async ({ page }) => {
      const band = page.locator('.band-card').first()
      const qKnob = band.locator('.knob-wrap').nth(1)
      // Over max
      await qKnob.locator('.knob-value').click()
      await qKnob.locator('.knob-input').fill('999')
      await qKnob.locator('.knob-input').press('Enter')
      await expect(qKnob.locator('.knob-value')).toContainText('200.0')
      // Under min
      await qKnob.locator('.knob-value').click()
      await qKnob.locator('.knob-input').fill('0')
      await qKnob.locator('.knob-input').press('Enter')
      await expect(qKnob.locator('.knob-value')).toContainText('1.0')
    })
  })
})
