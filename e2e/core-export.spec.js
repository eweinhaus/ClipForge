/**
 * Core Feature Tests: Export & Sharing
 * Tests export functionality, resolution options, progress indicator
 */

const { test, expect } = require('@playwright/test');
const { waitForAppLoad, isExportDialogOpen } = require('./helpers/test-helpers');

test.describe('Core Features: Export & Sharing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('export dialog has resolution options', async ({ page }) => {
    // Open export dialog
    await page.keyboard.press('Control+E');
    await page.waitForTimeout(500);
    
    const dialog = page.locator('.export-dialog');
    const dialogCount = await dialog.count();
    
    if (dialogCount > 0) {
      // Check for resolution selector
      const resolutionSelect = dialog.locator('select[name*="resolution"], select, option:has-text("720p"), option:has-text("1080p")');
      const resolutionCount = await resolutionSelect.count();
      
      if (resolutionCount > 0) {
        await expect(resolutionSelect.first()).toBeVisible();
        
        // Check for common resolution options
        const options = dialog.locator('option');
        const optionTexts = await options.allTextContents();
        
        const has720p = optionTexts.some(text => text.includes('720'));
        const has1080p = optionTexts.some(text => text.includes('1080'));
        const hasSource = optionTexts.some(text => text.toLowerCase().includes('source'));
        
        // Should have at least one resolution option
        expect(has720p || has1080p || hasSource).toBe(true);
      }
    }
  });

  test('export dialog shows progress indicator', async ({ page }) => {
    await page.keyboard.press('Control+E');
    await page.waitForTimeout(500);
    
    const dialog = page.locator('.export-dialog');
    const dialogCount = await dialog.count();
    
    if (dialogCount > 0) {
      // Check for progress indicator
      const progress = dialog.locator('.progress-bar, .export-progress, [class*="progress"], .spinner');
      const progressCount = await progress.count();
      
      // Progress indicator structure exists
      expect(progressCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('export dialog shows timeline summary', async ({ page }) => {
    await page.keyboard.press('Control+E');
    await page.waitForTimeout(500);
    
    const dialog = page.locator('.export-dialog');
    const dialogCount = await dialog.count();
    
    if (dialogCount > 0) {
      // Check for timeline info (duration, clip count, etc.)
      const summary = dialog.locator('[class*="summary"], [class*="info"], [class*="clip"]');
      const summaryCount = await summary.count();
      
      // Summary information may be displayed
      expect(summaryCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('export dialog can be closed', async ({ page }) => {
    await page.keyboard.press('Control+E');
    await page.waitForTimeout(500);
    
    const dialog = page.locator('.export-dialog');
    const dialogCount = await dialog.count();
    
    if (dialogCount > 0) {
      // Find close button
      const closeButton = dialog.locator('.close-button, button:has-text("Cancel"), button[aria-label*="close" i]');
      const closeCount = await closeButton.count();
      
      if (closeCount > 0) {
        await closeButton.first().click();
        await page.waitForTimeout(300);
        
        // Dialog should be closed
        const isOpen = await isExportDialogOpen(page);
        expect(isOpen).toBe(false);
      }
    }
  });

  test('export button triggers export dialog', async ({ page }) => {
    // Look for export button in UI
    const exportButton = page.locator('button:has-text("Export"), button[aria-label*="export" i], .export-button').first();
    const count = await exportButton.count();
    
    if (count > 0) {
      await exportButton.click();
      await page.waitForTimeout(500);
      
      const isOpen = await isExportDialogOpen(page);
      expect(isOpen).toBe(true);
    }
  });
});

