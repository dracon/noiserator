import { test, expect } from '@playwright/test'

test.describe('Knob Containment in Oscillator View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the oscillator view to fully load
    await expect(page.locator('.channel-panel')).toHaveCount(2)
  })

  test('oscillator view loads with channel panels', async ({ page }) => {
    const panels = page.locator('.channel-panel')
    await expect(panels).toHaveCount(2)
    
    // Verify left and right channel labels
    const leftLabel = page.locator('.ch-label').filter({ hasText: 'LEFT' })
    const rightLabel = page.locator('.ch-label').filter({ hasText: 'RIGHT' })
    await expect(leftLabel).toBeVisible()
    await expect(rightLabel).toBeVisible()
  })

  test('all knobs (FREQ, VOL, WAVE) are present in each channel', async ({ page }) => {
    const panels = page.locator('.channel-panel')
    
    for (let i = 0; i < 2; i++) {
      const panel = panels.nth(i)
      const knobs = panel.locator('.knob-wrap')
      
      // Should have at least 3 knobs (FREQ, VOL, WAVE)
      const knobCount = await knobs.count()
      expect(knobCount).toBeGreaterThanOrEqual(3)
      
      // Verify each knob label exists
      await expect(knobs.first().locator('.knob-label')).toContainText('FREQ')
      await expect(knobs.nth(1).locator('.knob-label')).toContainText('VOL')
      // WAVE knob is typically the third knob
      if (knobCount >= 3) {
        await expect(knobs.nth(2).locator('.knob-label')).toContainText('WAVE')
      }
    }
  })

  test('LEFT channel: all knobs fit within panel boundaries', async ({ page }) => {
    const leftPanel = page.locator('.channel-panel').first()
    const panelBox = await leftPanel.boundingBox()
    
    if (!panelBox) {
      throw new Error('LEFT panel has no bounding box')
    }
    
    const knobs = leftPanel.locator('.knob-wrap')
    const knobCount = await knobs.count()
    
    console.log(`\n[LEFT CHANNEL] Panel dimensions:`)
    console.log(`  Box: x=${panelBox.x}, y=${panelBox.y}, width=${panelBox.width}, height=${panelBox.height}`)
    
    for (let i = 0; i < Math.min(knobCount, 3); i++) {
      const knob = knobs.nth(i)
      const knobBox = await knob.boundingBox()
      const label = await knob.locator('.knob-label').textContent()
      
      if (!knobBox) {
        throw new Error(`LEFT channel knob ${i} (${label}) has no bounding box`)
      }
      
      console.log(`\n  Knob ${i} (${label}):`)
      console.log(`    Box: x=${knobBox.x}, y=${knobBox.y}, width=${knobBox.width}, height=${knobBox.height}`)
      console.log(`    Relative to panel: x=${knobBox.x - panelBox.x}, y=${knobBox.y - panelBox.y}`)
      
      // Check that knob is within panel boundaries
      const isWithinLeft = knobBox.x >= panelBox.x
      const isWithinRight = knobBox.x + knobBox.width <= panelBox.x + panelBox.width
      const isWithinTop = knobBox.y >= panelBox.y
      const isWithinBottom = knobBox.y + knobBox.height <= panelBox.y + panelBox.height
      
      console.log(`    Containment: left=${isWithinLeft}, right=${isWithinRight}, top=${isWithinTop}, bottom=${isWithinBottom}`)
      
      expect(isWithinLeft, `LEFT ${label} knob should not overflow left edge`).toBe(true)
      expect(isWithinRight, `LEFT ${label} knob should not overflow right edge`).toBe(true)
      expect(isWithinTop, `LEFT ${label} knob should not overflow top edge`).toBe(true)
      expect(isWithinBottom, `LEFT ${label} knob should not overflow bottom edge`).toBe(true)
    }
  })

  test('RIGHT channel: all knobs fit within panel boundaries', async ({ page }) => {
    const rightPanel = page.locator('.channel-panel').nth(1)
    const panelBox = await rightPanel.boundingBox()
    
    if (!panelBox) {
      throw new Error('RIGHT panel has no bounding box')
    }
    
    const knobs = rightPanel.locator('.knob-wrap')
    const knobCount = await knobs.count()
    
    console.log(`\n[RIGHT CHANNEL] Panel dimensions:`)
    console.log(`  Box: x=${panelBox.x}, y=${panelBox.y}, width=${panelBox.width}, height=${panelBox.height}`)
    
    for (let i = 0; i < Math.min(knobCount, 3); i++) {
      const knob = knobs.nth(i)
      const knobBox = await knob.boundingBox()
      const label = await knob.locator('.knob-label').textContent()
      
      if (!knobBox) {
        throw new Error(`RIGHT channel knob ${i} (${label}) has no bounding box`)
      }
      
      console.log(`\n  Knob ${i} (${label}):`)
      console.log(`    Box: x=${knobBox.x}, y=${knobBox.y}, width=${knobBox.width}, height=${knobBox.height}`)
      console.log(`    Relative to panel: x=${knobBox.x - panelBox.x}, y=${knobBox.y - panelBox.y}`)
      
      // Check that knob is within panel boundaries
      const isWithinLeft = knobBox.x >= panelBox.x
      const isWithinRight = knobBox.x + knobBox.width <= panelBox.x + panelBox.width
      const isWithinTop = knobBox.y >= panelBox.y
      const isWithinBottom = knobBox.y + knobBox.height <= panelBox.y + panelBox.height
      
      console.log(`    Containment: left=${isWithinLeft}, right=${isWithinRight}, top=${isWithinTop}, bottom=${isWithinBottom}`)
      
      expect(isWithinLeft, `RIGHT ${label} knob should not overflow left edge`).toBe(true)
      expect(isWithinRight, `RIGHT ${label} knob should not overflow right edge`).toBe(true)
      expect(isWithinTop, `RIGHT ${label} knob should not overflow top edge`).toBe(true)
      expect(isWithinBottom, `RIGHT ${label} knob should not overflow bottom edge`).toBe(true)
    }
  })

  test('WAVE knob text (value and label) is centered within knob container', async ({ page }) => {
    const panels = page.locator('.channel-panel')
    
    for (let panelIdx = 0; panelIdx < 2; panelIdx++) {
      const panel = panels.nth(panelIdx)
      const channelName = panelIdx === 0 ? 'LEFT' : 'RIGHT'
      
      // Find the WAVE knob (typically the 3rd knob)
      const knobs = panel.locator('.knob-wrap')
      let waveKnobIdx = -1
      
      for (let i = 0; i < await knobs.count(); i++) {
        const label = await knobs.nth(i).locator('.knob-label').textContent()
        if (label?.includes('WAVE')) {
          waveKnobIdx = i
          break
        }
      }
      
      if (waveKnobIdx === -1) {
        console.log(`[${channelName}] WAVE knob not found, skipping`)
        continue
      }
      
      const waveKnob = knobs.nth(waveKnobIdx)
      const knobBox = await waveKnob.boundingBox()
      const knobCenterX = knobBox!.x + knobBox!.width / 2
      const knobCenterY = knobBox!.y + knobBox!.height / 2
      
      console.log(`\n[${channelName}] WAVE knob centering:`)
      console.log(`  Knob center: x=${knobCenterX}, y=${knobCenterY}`)
      
      // Check knob-value element
      const valueElement = waveKnob.locator('.knob-value')
      if (await valueElement.isVisible()) {
        const valueBox = await valueElement.boundingBox()
        if (valueBox) {
          const valueCenterX = valueBox.x + valueBox.width / 2
          const valueCenterY = valueBox.y + valueBox.height / 2
          const xOffset = Math.abs(valueCenterX - knobCenterX)
          const yOffset = Math.abs(valueCenterY - knobCenterY)
          
          console.log(`  Value element center: x=${valueCenterX}, y=${valueCenterY}`)
          console.log(`  Center offset: x=${xOffset}, y=${yOffset}`)
          
          // Allow small offset for centering tolerance
          expect(xOffset, `[${channelName}] WAVE value should be horizontally centered`).toBeLessThan(5)
        }
      }
      
      // Check knob-label element
      const labelElement = waveKnob.locator('.knob-label')
      if (await labelElement.isVisible()) {
        const labelBox = await labelElement.boundingBox()
        if (labelBox) {
          const labelCenterX = labelBox.x + labelBox.width / 2
          const labelCenterY = labelBox.y + labelBox.height / 2
          const xOffset = Math.abs(labelCenterX - knobCenterX)
          const yOffset = Math.abs(labelCenterY - knobCenterY)
          
          console.log(`  Label element center: x=${labelCenterX}, y=${labelCenterY}`)
          console.log(`  Center offset: x=${xOffset}, y=${yOffset}`)
          
          // Allow small offset for centering tolerance
          expect(xOffset, `[${channelName}] WAVE label should be horizontally centered`).toBeLessThan(5)
        }
      }
    }
  })

  test('knob elements respect layout boundaries', async ({ page }) => {
    const panels = page.locator('.channel-panel')
    
    // This test verifies that knob positioning is constrained by layout
    // even if overflow CSS is set to 'visible' on parent elements
    
    for (let panelIdx = 0; panelIdx < 2; panelIdx++) {
      const panel = panels.nth(panelIdx)
      const channelName = panelIdx === 0 ? 'LEFT' : 'RIGHT'
      
      // Get panel dimensions
      const panelBox = await panel.boundingBox()
      if (!panelBox) continue
      
      console.log(`\n[${channelName}] Layout verification:`)
      console.log(`  Panel: x=${panelBox.x}, y=${panelBox.y}, w=${panelBox.width}, h=${panelBox.height}`)
      
      // Check that all knobs stay within bounds
      const knobs = panel.locator('.knob-wrap')
      let allKnobsContained = true
      
      for (let i = 0; i < Math.min(await knobs.count(), 3); i++) {
        const knobBox = await knobs.nth(i).boundingBox()
        if (!knobBox) continue
        
        const label = await knobs.nth(i).locator('.knob-label').textContent()
        
        const isContained = 
          knobBox.x >= panelBox.x &&
          knobBox.x + knobBox.width <= panelBox.x + panelBox.width &&
          knobBox.y >= panelBox.y &&
          knobBox.y + knobBox.height <= panelBox.y + panelBox.height
        
        console.log(`  Knob ${i} (${label}): ${isContained ? '✓ contained' : '✗ overflow'}`)
        
        if (!isContained) {
          allKnobsContained = false
        }
      }
      
      expect(allKnobsContained, `[${channelName}] All knobs should be contained within panel`).toBe(true)
    }
  })

  test('WAVE knob text does not extend beyond knob container edges', async ({ page }) => {
    const panels = page.locator('.channel-panel')
    
    for (let panelIdx = 0; panelIdx < 2; panelIdx++) {
      const panel = panels.nth(panelIdx)
      const channelName = panelIdx === 0 ? 'LEFT' : 'RIGHT'
      
      // Find the WAVE knob
      const knobs = panel.locator('.knob-wrap')
      let waveKnobIdx = -1
      
      for (let i = 0; i < await knobs.count(); i++) {
        const label = await knobs.nth(i).locator('.knob-label').textContent()
        if (label?.includes('WAVE')) {
          waveKnobIdx = i
          break
        }
      }
      
      if (waveKnobIdx === -1) {
        console.log(`[${channelName}] WAVE knob not found, skipping`)
        continue
      }
      
      const waveKnob = knobs.nth(waveKnobIdx)
      const knobBox = await waveKnob.boundingBox()
      
      if (!knobBox) {
        throw new Error(`${channelName} WAVE knob has no bounding box`)
      }
      
      console.log(`\n[${channelName}] WAVE knob text containment:`)
      console.log(`  Knob box: x=${knobBox.x}, y=${knobBox.y}, width=${knobBox.width}, height=${knobBox.height}`)
      
      // Check all text elements (value and label)
      const valueElement = waveKnob.locator('.knob-value')
      const labelElement = waveKnob.locator('.knob-label')
      
      const textElements = [
        { el: valueElement, name: 'value' },
        { el: labelElement, name: 'label' }
      ]
      
      for (const { el, name } of textElements) {
        if (await el.isVisible()) {
          const textBox = await el.boundingBox()
          if (textBox) {
            const isWithinLeft = textBox.x >= knobBox.x
            const isWithinRight = textBox.x + textBox.width <= knobBox.x + knobBox.width
            const isWithinTop = textBox.y >= knobBox.y
            const isWithinBottom = textBox.y + textBox.height <= knobBox.y + knobBox.height
            
            console.log(`  ${name}: x=${textBox.x}, y=${textBox.y}, width=${textBox.width}, height=${textBox.height}`)
            console.log(`  ${name} containment: left=${isWithinLeft}, right=${isWithinRight}, top=${isWithinTop}, bottom=${isWithinBottom}`)
            
            expect(isWithinLeft, `[${channelName}] WAVE ${name} should not overflow left`).toBe(true)
            expect(isWithinRight, `[${channelName}] WAVE ${name} should not overflow right`).toBe(true)
            expect(isWithinTop, `[${channelName}] WAVE ${name} should not overflow top`).toBe(true)
            expect(isWithinBottom, `[${channelName}] WAVE ${name} should not overflow bottom`).toBe(true)
          }
        }
      }
    }
  })

  test('LEFT channel: visual verification screenshot', async ({ page }) => {
    const leftPanel = page.locator('.channel-panel').first()
    await leftPanel.screenshot({ path: 'test-results/left-channel-knobs.png' })
  })

  test('RIGHT channel: visual verification screenshot', async ({ page }) => {
    const rightPanel = page.locator('.channel-panel').nth(1)
    await rightPanel.screenshot({ path: 'test-results/right-channel-knobs.png' })
  })

  test('both channels full view screenshot', async ({ page }) => {
    const container = page.locator('.oscillator-view')
    if (await container.isVisible()) {
      await container.screenshot({ path: 'test-results/both-channels-knobs.png' })
    }
  })

  test('comprehensive knob metrics report', async ({ page }) => {
    const panels = page.locator('.channel-panel')
    
    console.log('\n========== COMPREHENSIVE KNOB METRICS REPORT ==========')
    
    for (let panelIdx = 0; panelIdx < 2; panelIdx++) {
      const panel = panels.nth(panelIdx)
      const channelName = panelIdx === 0 ? 'LEFT' : 'RIGHT'
      const panelBox = await panel.boundingBox()
      
      if (!panelBox) continue
      
      console.log(`\n[${channelName} CHANNEL]`)
      console.log(`Panel: x=${Math.round(panelBox.x)}, y=${Math.round(panelBox.y)}, w=${Math.round(panelBox.width)}, h=${Math.round(panelBox.height)}`)
      
      const knobs = panel.locator('.knob-wrap')
      const knobCount = await knobs.count()
      
      for (let i = 0; i < Math.min(knobCount, 3); i++) {
        const knob = knobs.nth(i)
        const label = await knob.locator('.knob-label').textContent()
        const value = await knob.locator('.knob-value').textContent()
        const knobBox = await knob.boundingBox()
        
        if (!knobBox) continue
        
        const relativeX = knobBox.x - panelBox.x
        const relativeY = knobBox.y - panelBox.y
        const overflowLeft = Math.max(0, panelBox.x - knobBox.x)
        const overflowRight = Math.max(0, knobBox.x + knobBox.width - (panelBox.x + panelBox.width))
        const overflowTop = Math.max(0, panelBox.y - knobBox.y)
        const overflowBottom = Math.max(0, knobBox.y + knobBox.height - (panelBox.y + panelBox.height))
        
        console.log(`
  Knob ${i}: ${label}
    Position: x=${Math.round(knobBox.x)}, y=${Math.round(knobBox.y)}
    Size: w=${Math.round(knobBox.width)}, h=${Math.round(knobBox.height)}
    Relative: x=${Math.round(relativeX)}, y=${Math.round(relativeY)}
    Value: ${value}
    Overflow: left=${Math.round(overflowLeft)}, right=${Math.round(overflowRight)}, top=${Math.round(overflowTop)}, bottom=${Math.round(overflowBottom)}
    Status: ${overflowLeft === 0 && overflowRight === 0 && overflowTop === 0 && overflowBottom === 0 ? '✓ CONTAINED' : '✗ OVERFLOW'}`)
      }
    }
    
    console.log('\n=======================================================\n')
  })
})
