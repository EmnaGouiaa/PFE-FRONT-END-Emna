const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:4200/connexion');
  await page.fill('input[formcontrolname="email"]', 'admin@test.com');
  await page.fill('input[formcontrolname="motDePasse"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  const texts = await page.evaluate(() => {
    const html = document.querySelector('app-admin-dashboard')?.innerHTML || '';
    const h3s = Array.from(document.querySelectorAll('app-admin-dashboard h3')).map(el => el.textContent?.trim());
    const sync = document.querySelector('app-admin-dashboard .sync-pill span:last-child')?.textContent?.trim();
    const body = document.querySelector('app-admin-dashboard')?.textContent?.slice(0, 1500);
    return { h3s, sync, body, snippet: html.slice(0, 3000) };
  });
  console.log(JSON.stringify(texts, null, 2));
  await browser.close();
})();
