/**
 * MVP Requirement Tests: Video Import
 * Tests drag & drop and file picker functionality
 */

const { test, expect } = require('@playwright/test');
const { waitForAppLoad, waitForImportComplete, getClipCount } = require('./helpers/test-helpers');

test.describe('MVP: Video Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('app loads successfully', async ({ page }) => {
    // Check that main UI components are visible
    await expect(page.locator('.app-container')).toBeVisible();
    
    // Check for file importer component
    const fileImporter = page.locator('.file-importer');
    await expect(fileImporter).toBeVisible();
    
    // Check for drag & drop zone
    const dropZone = page.locator('.drop-zone');
    await expect(dropZone).toBeVisible();
  });

  test('drag and drop zone is visible', async ({ page }) => {
    const dropZone = page.locator('.drop-zone');
    await expect(dropZone).toBeVisible();
    
    // Check for drop zone content
    await expect(dropZone.locator('text=Drag & drop video files here')).toBeVisible();
    await expect(dropZone.locator('text=Supports: MP4, MOV, WebM')).toBeVisible();
  });

  test('file picker button is visible', async ({ page }) => {
    const filePickerBtn = page.locator('.file-picker-btn, label[for="file-input"]');
    await expect(filePickerBtn).toBeVisible();
    
    // Check button text
    const buttonText = await filePickerBtn.textContent();
    expect(buttonText).toContain('choose files');
  });

  test('timeline is visible and ready', async ({ page }) => {
    // Check for timeline container
    const timeline = page.locator('.multi-track-timeline, .timeline-container');
    await expect(timeline).toBeVisible();
  });

  test('preview player is visible', async ({ page }) => {
    const preview = page.locator('.multi-track-preview, .video-preview');
    await expect(preview).toBeVisible();
  });

  // Note: Actual file import testing requires Electron APIs
  // These tests verify UI components are present
  // Full integration testing would require Electron-specific test tools
});

