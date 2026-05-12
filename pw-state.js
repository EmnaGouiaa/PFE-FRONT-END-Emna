const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:4200/connexion');
  await page.fill('input[formcontrolname="email"]', 'admin@test.com');
  await page.fill('input[formcontrolname="motDePasse"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  const state = await page.evaluate(() => {
    const cmp = window.ng?.getComponent(document.querySelector('app-admin-dashboard'));
    if (!cmp) return null;
    return {
      isLoading: cmp.isLoading,
      isLoadingUsers: cmp.isLoadingUsers,
      isLoadingEntreprises: cmp.isLoadingEntreprises,
      apiStatus: cmp.apiStatus,
      stats: cmp.stats,
      entreprises: cmp.entreprises,
      recentUsersLength: cmp.recentUsers?.length,
      roleDistributionLength: cmp.roleDistribution?.length,
      errorMessage: cmp.errorMessage,
      lastUpdatedAt: cmp.lastUpdatedAt
    };
  });
  console.log(JSON.stringify(state, null, 2));
  await browser.close();
})();
