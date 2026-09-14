// Isolated headless Chromium only. Never uses the owner's Chrome profile.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'qa-screens/pilot-scale');
fs.mkdirSync(output, { recursive: true });
const url = 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const width of [375, 390, 393, 430, 768, 1024, 1440, 1920]) {
      const height = width < 700 ? 844 : 900;
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.hero-object img').waitFor();
      await page.screenshot({ path: path.join(output, `${width}-hero.png`) });
      // Scroll through the whole page, including lazy image anchors.
      for (const section of await page.locator('main > section, .longread > section').all()) {
        await section.scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow ${width}`);
      }
      await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
      const grids = await page.locator('.pricing-grid').evaluateAll(elements => elements.map(el => getComputedStyle(el).gridTemplateColumns.split(' ').length));
      assert.deepEqual(grids, width <= 600 ? [1, 1] : [2, 2]);
      if ([390, 1440].includes(width)) {
        for (const id of ['pilot-scale', 'how-it-works', 'objects', 'market-scan', 'letters', 'production', 'delivery', 'report', 'campaign', 'start']) {
          await page.locator(`#${id}`).evaluate(el => el.scrollIntoView({ block: 'start' }));
          await page.screenshot({ path: path.join(output, `${width}-${id}.png`) });
        }
        for (const detail of await page.locator('.research-detail, .letter-example').all()) {
          const wasOpen = await detail.getAttribute('open');
          if (wasOpen === null) await detail.locator('summary').click();
          assert.equal(await detail.evaluate(el => el.open), true);
          assert.equal(await detail.locator('p').first().isVisible(), true);
          await detail.locator('summary').click();
          assert.equal(await detail.evaluate(el => el.open), false);
        }
        for (const link of await page.locator('a[href="#start"]').all()) {
          await link.click();
          assert.equal(new URL(page.url()).hash, '#start');
          assert.equal(await page.locator('#start h2').isVisible(), true);
        }
        const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll(links => links.filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash));
        assert.deepEqual(brokenAnchors, []);
        await page.locator('#lead-website').focus();
        assert.equal(await page.locator('#lead-website').evaluate(el => el === document.activeElement), true);
        assert.equal(await page.locator('#campaign-enquiry').evaluate(el => el.checkValidity()), false);
        await page.locator('#lead-website').fill('https://example.com');
        await page.locator('#lead-name').fill('Local QA');
        await page.locator('#lead-company').fill('Example');
        await page.locator('#lead-phone').fill('+1 212 555 0123');
        await page.locator('#lead-email').fill('qa@example.com');
        await page.getByRole('radio', { name: 'Email', exact: true }).check();
        assert.equal(await page.locator('#campaign-enquiry').evaluate(el => el.checkValidity()), true);
        // Failed send must retain fields and restore the exact requested label.
        const failure = route => route.fulfill({status: 503, contentType:'application/json', body: JSON.stringify({received:false,error:'Local QA simulated failure.'})});
        await page.route('**/api/open/leads', failure, {times:1});
        await page.getByRole('button', {name:'Send my website', exact:true}).click();
        await page.getByText('Local QA simulated failure.').waitFor();
        assert.equal(await page.locator('#lead-website').inputValue(), 'https://example.com');
        assert.equal(await page.getByRole('button', {name:'Send my website', exact:true}).isEnabled(), true);
        await page.unroute('**/api/open/leads', failure);
        const responsePromise = page.waitForResponse(r => r.url().endsWith('/api/open/leads'));
        await page.getByRole('button', {name:'Send my website', exact:true}).click();
        const response = await responsePromise;
        assert.equal(response.status(), 201);
        assert.equal((await response.json()).received, true);
        assert.equal(response.request().postDataJSON().website, 'https://example.com');
        await page.locator('#enquiry-success').waitFor();
        assert.equal(await page.locator('#campaign-enquiry').isVisible(), false);
        assert.equal(await page.locator('#enquiry-success').evaluate(el => el === document.activeElement), true);
        await page.screenshot({path:path.join(output, `${width}-form-success.png`)});
      }
      assert.deepEqual(errors.filter(e => !e.startsWith('503 ')), []);
      results.push({width, height, overflow:false, brokenImages:0, errors:0, journeys:[390,1440].includes(width)});
      await page.close();
    }
    const page = await browser.newPage();
    for (const route of ['/ms', '/open', '/handling']) {
      const response = await page.goto(url + route);
      assert.equal(response.status(), 200);
      assert.ok(await page.locator('h1').count());
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({browser: browser.version(), results}, null, 2));
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
