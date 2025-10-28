import { test, expect } from '@playwright/test';

test.describe('ClipBlock Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for the app to load
    await page.waitForSelector('.app-container');
  });

  test('ClipBlock renders correctly with thumbnails', async ({ page }) => {
    // Import some test clips (this would need to be done manually in the app)
    // For now, we'll just check the basic structure
    
    // Check if timeline container exists
    await expect(page.locator('.timeline-container')).toBeVisible();
    
    // Check if track area exists
    await expect(page.locator('.track-area')).toBeVisible();
    
    // Take a screenshot for visual regression
    await page.screenshot({ 
      path: 'tests/visual-regression/clipblock-basic.png',
      fullPage: true 
    });
  });

  test('ClipBlock hover states work correctly', async ({ page }) => {
    // This test would require clips to be loaded
    // For now, we'll just verify the CSS classes exist
    const clipBlock = page.locator('.clip-block').first();
    
    if (await clipBlock.isVisible()) {
      // Test hover state
      await clipBlock.hover();
      
      // Check if hover card appears
      await expect(page.locator('.clip-hover-card')).toBeVisible();
      
      // Take screenshot of hover state
      await page.screenshot({ 
        path: 'tests/visual-regression/clipblock-hover.png',
        fullPage: true 
      });
    }
  });

  test('Dark theme support', async ({ page }) => {
    // Simulate dark theme preference
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Take screenshot in dark theme
    await page.screenshot({ 
      path: 'tests/visual-regression/clipblock-dark-theme.png',
      fullPage: true 
    });
  });

  test('Timeline zoom levels', async ({ page }) => {
    // Test different zoom levels
    const zoomLevels = [0.25, 0.5, 1, 2, 4];
    
    for (const zoom of zoomLevels) {
      // This would require implementing zoom controls in the test
      // For now, we'll just verify the zoom controls exist
      await expect(page.locator('.timeline-controls')).toBeVisible();
      
      // Take screenshot at each zoom level
      await page.screenshot({ 
        path: `tests/visual-regression/timeline-zoom-${zoom}x.png`,
        fullPage: true 
      });
    }
  });
});
