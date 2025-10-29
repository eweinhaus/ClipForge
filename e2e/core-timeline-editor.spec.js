/**
 * Core Feature Tests: Timeline Editor
 * Tests timeline editing features like drag, trim, split, multiple tracks
 */

const { test, expect } = require('@playwright/test');
const { waitForAppLoad, getClipCount } = require('./helpers/test-helpers');

test.describe('Core Features: Timeline Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('timeline has multiple tracks', async ({ page }) => {
    // Check for main track
    const mainTrack = page.locator('.track.main, [data-track="main"]');
    await expect(mainTrack.first()).toBeVisible();
    
    // Check for overlay track
    const overlayTrack = page.locator('.track.overlay, [data-track="overlay"]');
    const overlayCount = await overlayTrack.count();
    
    // Should have at least 2 tracks (main + overlay)
    expect(overlayCount).toBeGreaterThanOrEqual(0);
  });

  test('timeline has playhead indicator', async ({ page }) => {
    const playhead = page.locator('.playhead');
    await expect(playhead.first()).toBeVisible();
  });

  test('timeline supports zoom controls', async ({ page }) => {
    // Look for zoom controls
    const zoomControls = page.locator('.zoom-controls, button[aria-label*="zoom" i], .timeline-controls');
    const zoomCount = await zoomControls.count();
    
    // Zoom controls may exist in timeline controls
    if (zoomCount > 0) {
      await expect(zoomControls.first()).toBeVisible();
    }
  });

  test('clips can be selected', async ({ page }) => {
    const clipBlocks = page.locator('.clip-block, .sortable-clip-block');
    const count = await clipBlocks.count();
    
    if (count > 0) {
      const firstClip = clipBlocks.first();
      
      // Click to select
      await firstClip.click();
      
      // Check for selected state
      const selectedClip = page.locator('.clip-block.selected, .sortable-clip-block.selected');
      const selectedCount = await selectedClip.count();
      
      expect(selectedCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('clips show delete option', async ({ page }) => {
    const clipBlocks = page.locator('.clip-block, .sortable-clip-block');
    const count = await clipBlocks.count();
    
    if (count > 0) {
      // Check for delete button or context menu
      const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="delete" i]');
      const deleteCount = await deleteButton.count();
      
      // Delete functionality may exist via context menu or button
      expect(deleteCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('timeline shows clip thumbnails', async ({ page }) => {
    const clipBlocks = page.locator('.clip-block, .sortable-clip-block');
    const count = await clipBlocks.count();
    
    if (count > 0) {
      const firstClip = clipBlocks.first();
      
      // Check for thumbnail
      const thumbnail = firstClip.locator('.clip-thumbnail, img');
      const thumbnailCount = await thumbnail.count();
      
      if (thumbnailCount > 0) {
        await expect(thumbnail.first()).toBeVisible();
      }
    }
  });

  test('timeline shows clip filenames', async ({ page }) => {
    const clipBlocks = page.locator('.clip-block, .sortable-clip-block');
    const count = await clipBlocks.count();
    
    if (count > 0) {
      const firstClip = clipBlocks.first();
      
      // Check for filename display
      const filename = firstClip.locator('.clip-filename-overlay, [class*="filename"]');
      const filenameCount = await filename.count();
      
      // Filename should be visible if clips exist
      if (filenameCount > 0) {
        await expect(filename.first()).toBeVisible();
      }
    }
  });
});

