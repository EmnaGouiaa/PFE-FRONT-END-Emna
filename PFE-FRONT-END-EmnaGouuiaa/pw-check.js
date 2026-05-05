const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push(`[console:${msg.type()}] ${msg.text()}`));
  await page.goto('http://localhost:4200/connexion');
  await page.fill('input[formcontrolname="email"]', 'admin@test.com');
  await page.fill('input[formcontrolname="motDePasse"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(12000);
  console.log('URL:', page.url());
  console.log('TEXT:', (await page.locator('body').innerText()).slice(0, 3000));
  await page.screenshot({ path: 'admin-dashboard-shot.png', fullPage: true });
  console.log('HTML:', (await page.locator('body').innerHTML()).slice(0, 5000));
  console.log('LOGS:\n' + logs.join('\n'));
  await browser.close();
})();
