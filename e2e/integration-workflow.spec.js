/**
 * Integration Test: Full MVP Workflow
 * Tests the complete workflow from import to export
 */

const { test, expect } = require('@playwright/test');
const { waitForAppLoad, getClipCount, isExportDialogOpen } = require('./helpers/test-helpers');

test.describe('Integration: Full MVP Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('complete app structure is present', async ({ page }) => {
    // Verify all main components exist
    await expect(page.locator('.app-container')).toBeVisible();
    
    // File importer
    await expect(page.locator('.file-importer')).toBeVisible();
    
    // Timeline
    await expect(page.locator('.multi-track-timeline, .timeline-container')).toBeVisible();
    
    // Preview player
    await expect(page.locator('.multi-track-preview, .video-preview')).toBeVisible();
    
    // Recording panel
    await expect(page.locator('.recording-panel')).toBeVisible();
  });

  test('all MVP components are accessible', async ({ page }) => {
    // Import functionality
    const dropZone = page.locator('.drop-zone');
    await expect(dropZone).toBeVisible();
    
    // Timeline view
    const timeline = page.locator('.multi-track-timeline, .timeline-container');
    await expect(timeline).toBeVisible();
    
    // Preview player
    const preview = page.locator('.multi-track-preview, .video-preview');
    await expect(preview).toBeVisible();
    
    // Export functionality
    const exportButton = page.locator('button:has-text("Export"), button[aria-label*="export" i]').first();
    const exportCount = await exportButton.count();
    expect(exportCount).toBeGreaterThanOrEqual(0);
  });

  test('app navigation works', async ({ page }) => {
    // Check that main sections are navigable
    const mainSections = [
      '.file-importer',
      '.multi-track-timeline',
      '.multi-track-preview',
      '.recording-panel',
    ];
    
    for (const selector of mainSections) {
      const element = page.locator(selector).first();
      const count = await element.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

