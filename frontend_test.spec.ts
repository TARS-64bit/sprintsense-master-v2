import { test, expect } from '@playwright/test';

test('Verify Frontend Application', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true });

  await page.goto('http://localhost:3000/settings');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/settings.png', fullPage: true });
});
