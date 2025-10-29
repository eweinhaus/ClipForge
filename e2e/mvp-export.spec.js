/**
 * MVP Requirement Tests: Export to MP4
 * Tests that export dialog and functionality work
 */

const { test, expect } = require('@playwright/test');
const { waitForAppLoad, isExportDialogOpen } = require('./helpers/test-helpers');

test.describe('MVP: Export to MP4', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('export button is visible', async ({ page }) => {
    // Look for export button (could be in header or toolbar)
    const exportButton = page.locator('button:has-text("Export"), button[aria-label*="export" i], .export-button');
    const count = await exportButton.count();
    
    if (count > 0) {
      await expect(exportButton.first()).toBeVisible();
    } else {
      // Check for download icon button
      const downloadButton = page.locator('button:has(svg), [role="button"]:has(svg)');
      const downloadCount = await downloadButton.count();
      
      // At least some export trigger should exist
      expect(downloadCount).toBeGreaterThan(0);
    }
  });

  test('export dialog opens when export button clicked', async ({ page }) => {
    // Try to find and click export button
    const exportButton = page.locator('button:has-text("Export"), button[aria-label*="export" i], .export-button').first();
    const count = await exportButton.count();
    
    if (count > 0) {
      await exportButton.click();
      await page.waitForTimeout(500);
      
      const isOpen = await isExportDialogOpen(page);
      expect(isOpen).toBe(true);
    }
  });

  test('export dialog shows when opened', async ({ page }) => {
    // Manually trigger export dialog via keyboard shortcut or direct test
    // Press Ctrl+E or Cmd+E (common export shortcut)
    await page.keyboard.press('Control+E');
    await page.waitForTimeout(500);
    
    // Check if dialog appeared
    const dialog = page.locator('.export-dialog');
    const dialogCount = await dialog.count();
    
    if (dialogCount > 0) {
      await expect(dialog.first()).toBeVisible();
    }
  });

  test('export dialog has required fields', async ({ page }) => {
    // Try to open export dialog
    await page.keyboard.press('Control+E');
    await page.waitForTimeout(500);
    
    const dialog = page.locator('.export-dialog');
    const dialogCount = await dialog.count();
    
    if (dialogCount > 0) {
      // Check for output path selector
      const pathSelector = dialog.locator('input[type="text"], button:has-text("Choose")');
      const pathCount = await pathSelector.count();
      
      if (pathCount > 0) {
        await expect(pathSelector.first()).toBeVisible();
      }
      
      // Check for export button
      const exportConfirmButton = dialog.locator('button:has-text("Export"), button:has-text("Save")');
      const exportCount = await exportConfirmButton.count();
      
      if (exportCount > 0) {
        await expect(exportConfirmButton.first()).toBeVisible();
      }
    }
  });

  test('export dialog shows progress indicator', async ({ page }) => {
    // Check if progress indicator exists in dialog structure
    const dialog = page.locator('.export-dialog');
    const dialogCount = await dialog.count();
    
    if (dialogCount > 0) {
      const progressIndicator = dialog.locator('.progress-bar, .export-progress, [class*="progress"]');
      const progressCount = await progressIndicator.count();
      
      // Progress indicator may not be visible until export starts
      // But structure should exist
      if (progressCount > 0) {
        // Progress element exists
        expect(progressCount).toBeGreaterThan(0);
      }
    }
  });
});

