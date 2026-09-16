// Uses isolated bundled browsers and a temporary local intake. No production leads.
const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.COIN_QA_URL || 'http://127.0.0.1:4174';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw new Error('Local QA only');
const out = path.resolve(__dirname, '../qa-screens/ms-campaign-v3');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const results=[];
 for (const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
  const browser=await engine.launch({headless:true});
  try {
   for(const width of [360,390,768,1440]) {
    const page=await browser.newPage({viewport:{width,height:width<700?844:900},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const home = {};
    for(const route of ['/','/ms']) {
     await page.goto(base+route);await page.evaluate(()=>document.fonts.ready);
     assert.equal(await page.locator('form').count(),1);
     await page.screenshot({path:path.join(out,`${name}-${width}-${route==='/'?'home':'ms'}-hero.png`)});
     for(const plan of ['pilot','scale']) {
      for(const field of ['volume','price','unit']) {
       const val=await page.locator(`#campaign [data-pricing="${plan}:${field}"]`).innerText();
       if(route==='/')home[`${plan}:${field}`]=val;else assert.equal(val,home[`${plan}:${field}`]);
      }
      await page.locator(`[data-plan=${plan}]`).first().click();
      assert.equal(await page.locator('#lead-interest').inputValue(),plan);
     }
     await page.locator('.hero a[href="#start"]').click();
     assert.equal(await page.locator('#lead-interest').inputValue(),'scale');
     for(const el of await page.locator('main .chapter').all()) {
      await el.scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${route} ${width}`);
     }
     assert.deepEqual(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)),[]);
    }
    assert.equal(await page.locator('#development-notes').evaluate(e=>e.open),false);
    for(const id of ['research-method','research-exercise','research-evidence','research-to-letter','start']) {
     await page.locator('#'+id).evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:path.join(out,`${name}-${width}-${id}.png`)});
    }
    const layers=await page.locator('.ms-layers>div').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));
    if(width>700)assert.equal(layers[0].y,layers[2].y);else assert.equal(layers[0].x,layers[2].x);
    assert.equal(await page.locator('.ms-exercise').evaluate(e=>getComputedStyle(e).display),'block');
    await page.locator('#anton-note a').click();await page.waitForFunction(()=>document.querySelector('#development-notes').open);assert.equal(await page.locator('#development-notes').evaluate(e=>e.open),true);
    await page.locator('#development-notes>summary').focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('#development-notes').evaluate(e=>e.open),false);
    for(const id of ['nachalo','tupik','pervaya-sistema','arkhitektura','perelom','final']) {
     await page.goto(base+'/ms#'+id);
     await page.waitForFunction(()=>document.querySelector('#development-notes').open);
     assert.equal(await page.locator('#'+id).isVisible(),true);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
    await page.goto(base+'/ms');
    const internal=await page.locator('a[href^="#"],a[href^="/#"]').evaluateAll(links=>links.map(a=>a.getAttribute('href')));
    for(const href of internal.filter(h=>h.startsWith('#'))) assert.equal(await page.locator(href).count(),1,href);
    const targets=internal.filter(h=>h.startsWith('/#'));
    const mirror=await page.request.get(base+'/ms/');assert.equal(await mirror.text(),await (await page.request.get(base+'/ms')).text());
    await page.locator('#lead-website').fill('example.com');await page.locator('#lead-name').fill('Local Market Scan QA');await page.locator('#lead-email').fill('qa@example.com');
    await page.locator('#lead-interest').selectOption('pilot');
    assert.equal(await page.locator('#lead-website').inputValue(),'https://example.com');
    assert.equal(await page.locator('#lead-phone').evaluate(e=>e.required),false);
    await page.locator('#lead-website').focus();await page.keyboard.press('Tab');assert.equal(await page.locator('#lead-name').evaluate(e=>e===document.activeElement),true);
    // A 200 response without confirmed receipt must also be treated as an error.
    await page.route('**/api/open/leads',r=>r.fulfill({status:200,contentType:'application/json',body:'{"received":false}'}),{times:1});
    await page.getByRole('button',{name:'Send my website',exact:true}).click();await page.locator('#enquiry-status.is-error').waitFor();
    assert.equal(await page.locator('#enquiry-success').isVisible(),false);
    assert.equal(await page.locator('#lead-email').inputValue(),'qa@example.com');
    if(width===390) {
     const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/open/leads'));
     await page.getByRole('button',{name:'Send my website',exact:true}).click();
     const response=await responsePromise;assert.equal(response.status(),201);
     const payload=response.request().postDataJSON();assert.equal(payload.website,'https://example.com');assert.equal(payload.source,'/ms');assert.equal(payload.campaign_interest,'pilot');
     await page.locator('#enquiry-success').waitFor();assert.equal(await page.locator('#enquiry-success').evaluate(e=>e===document.activeElement),true);
    }
    await page.goto(base+'/');for(const target of targets)assert.equal(await page.locator(target.slice(1)).count(),1,target);
    assert.deepEqual(errors,[]);results.push({name,width,passed:true});await page.close();
   }
   if(name==='chromium') {
    const page=await browser.newPage();await page.goto(base+'/ms');
    await page.locator('#lead-website').fill('example.com');await page.locator('#lead-name').fill('Local timeout QA');await page.locator('#lead-email').fill('qa@example.com');
    let sent,reference;const handler=async r=>{sent=r.request().postDataJSON();reference=(await (await r.fetch()).json()).reference;};
    await page.route('**/api/open/leads',handler,{times:1});
    await page.getByRole('button',{name:'Send my website',exact:true}).click();
    assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
    await page.locator('#enquiry-status.is-error').waitFor({timeout:30000});assert.equal(await page.locator('#enquiry-success').isVisible(),false);
    await page.unroute('**/api/open/leads',handler);
    const rp=page.waitForResponse(r=>r.url().endsWith('/api/open/leads'));
    await page.getByRole('button',{name:'Send my website',exact:true}).click();const response=await rp;
    assert.equal(response.status(),201);assert.equal(response.request().postDataJSON().request_id,sent.request_id);assert.equal((await response.json()).reference,reference);
    await page.locator('#enquiry-success').waitFor();results.push({timeoutRetry:true,sameServerRecord:true});
   }
  } finally { await browser.close(); }
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(results);
})().catch(e=>{console.error(e);process.exitCode=1});
