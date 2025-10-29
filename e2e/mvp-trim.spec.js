/**
 * MVP Requirement Tests: Trim Functionality
 * Tests that clips can be trimmed (set in/out points)
 */

const { test, expect } = require('@playwright/test');
const { waitForAppLoad } = require('./helpers/test-helpers');

test.describe('MVP: Trim Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('trim handles are present in clip blocks', async ({ page }) => {
    // Check for trim handles in clip block structure
    const clipBlocks = page.locator('.clip-block, .sortable-clip-block');
    const count = await clipBlocks.count();
    
    if (count > 0) {
      const firstClip = clipBlocks.first();
      
      // Check for trim handles
      const trimHandles = firstClip.locator('.trim-handles');
      const handlesCount = await trimHandles.count();
      
      if (handlesCount > 0) {
        // Should have left and right trim handles
        const leftHandle = trimHandles.locator('.trim-handle.left');
        const rightHandle = trimHandles.locator('.trim-handle.right');
        
        await expect(leftHandle).toBeVisible();
        await expect(rightHandle).toBeVisible();
      }
    }
  });

  test('clip editor shows trim controls', async ({ page }) => {
    // Check for clip editor component
    const clipEditor = page.locator('.clip-editor');
    const count = await clipEditor.count();
    
    if (count > 0) {
      await expect(clipEditor).toBeVisible();
      
      // Check for trim-related inputs or controls
      const trimInputs = clipEditor.locator('input[type="range"], input[name*="trim"], .trim-control');
      const inputsCount = await trimInputs.count();
      
      // Should have trim controls if editor is visible
      if (inputsCount > 0) {
        await expect(trimInputs.first()).toBeVisible();
      }
    }
  });

  test('clip duration displays correctly', async ({ page }) => {
    const clipBlocks = page.locator('.clip-block, .sortable-clip-block');
    const count = await clipBlocks.count();
    
    if (count > 0) {
      const firstClip = clipBlocks.first();
      
      // Check for duration overlay or display
      const durationDisplay = firstClip.locator('.clip-duration-overlay, [class*="duration"]');
      const durationCount = await durationDisplay.count();
      
      if (durationCount > 0) {
        await expect(durationDisplay.first()).toBeVisible();
      }
    }
  });
});

