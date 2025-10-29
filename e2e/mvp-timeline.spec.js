/**
 * MVP Requirement Tests: Timeline View
 * Tests that timeline displays clips correctly
 */

const { test, expect } = require('@playwright/test');
const { waitForAppLoad, getClipCount } = require('./helpers/test-helpers');

test.describe('MVP: Timeline View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('timeline displays empty state correctly', async ({ page }) => {
    const timeline = page.locator('.multi-track-timeline, .timeline-container');
    await expect(timeline).toBeVisible();
    
    // Check that timeline shows empty state or ready for clips
    const clipCount = await getClipCount(page);
    expect(clipCount).toBe(0);
  });

  test('timeline has track structure', async ({ page }) => {
    // Check for track elements
    const tracks = page.locator('.track, .track-area');
    
    // Should have at least main track
    const mainTrack = page.locator('.track.main, [data-track="main"]').first();
    await expect(mainTrack).toBeVisible();
    
    // May have overlay track
    const overlayTrack = page.locator('.track.overlay, [data-track="overlay"]').first();
    // Overlay track may or may not be visible initially
  });

  test('timeline has time ruler', async ({ page }) => {
    const timeRuler = page.locator('.time-ruler, .timeline-ruler');
    await expect(timeRuler).toBeVisible();
  });

  test('timeline has playhead', async ({ page }) => {
    const playhead = page.locator('.playhead');
    await expect(playhead).toBeVisible();
  });

  test('timeline supports horizontal scrolling', async ({ page }) => {
    const timelineContent = page.locator('.timeline-content, .timeline-scroll-container');
    await expect(timelineContent).toBeVisible();
    
    // Check that timeline container is scrollable
    const scrollContainer = timelineContent.locator('..').first();
    const overflow = await scrollContainer.evaluate(el => window.getComputedStyle(el).overflowX);
    expect(['auto', 'scroll']).toContain(overflow);
  });
});

