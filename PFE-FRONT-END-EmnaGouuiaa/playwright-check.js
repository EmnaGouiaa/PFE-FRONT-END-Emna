const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];
  const requests = [];
  page.on('console', msg => logs.push(`[console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[pageerror] ${err.message}`));
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/api/')) {
      requests.push(`${res.status()} ${url}`);
    }
  });
  await page.goto('http://localhost:4200/connexion', { waitUntil: 'networkidle' });
  await page.fill('input[formcontrolname="email"]', 'admin@test.com');
  await page.fill('input[formcontrolname="motDePasse"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());
  console.log('BODY:', (await page.textContent('body')).slice(0, 2000));
  console.log('REQUESTS:\n' + requests.join('\n'));
  console.log('LOGS:\n' + logs.join('\n'));
  await browser.close();
})();
