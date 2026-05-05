import { test } from '@playwright/test';

test('admin runtime check', async ({ page }) => {
  const logs: string[] = [];
  const requests: string[] = [];
  page.on('console', msg => logs.push(`[console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[pageerror] ${err.message}`));
  page.on('response', res => {
    const url = res.url();
    if (url.includes('/api/')) requests.push(`${res.status()} ${url}`);
  });

  await page.goto('http://localhost:4200/connexion');
  await page.fill('input[formcontrolname="email"]', 'admin@test.com');
  await page.fill('input[formcontrolname="motDePasse"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  console.log('URL:', page.url());
  console.log('TEXT:', (await page.locator('body').innerText()).slice(0, 2500));
  console.log('REQUESTS:', requests.join('\n'));
  console.log('LOGS:', logs.join('\n'));
});
