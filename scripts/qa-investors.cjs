// Isolated Playwright Chromium. No ordinary browser profile and no real lead requests.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const origin=process.env.COIN_QA_ORIGIN||'http://127.0.0.1:4174';
const output=path.resolve('qa-screens/investors');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for(const width of [390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:width<700?844:900},reducedMotion:'reduce'}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/investors/');await page.evaluate(()=>document.fonts.ready);
   await page.locator('#im-filters:not([hidden])').waitFor();
   assert.equal(await page.locator('h1').count(),1);
   for(const section of await page.locator('main>section').all()){await section.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${width}`);}
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,`${width}-intro.png`)});
   await page.selectOption('[name=sectors]','ai');await page.selectOption('[name=stages]','seed');await page.selectOption('[name=investmentGeographies]','US');await page.fill('[name=check]','750000');await page.locator('#im-filters button[type=submit]').click();
   const profile=page.locator('[data-investor="2048-ventures"]');await profile.locator('summary').click();
   assert.equal(await profile.locator('[data-match-label]').textContent(),'Matches your selected criteria');
   await profile.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`${width}-profile.png`)});
   await profile.locator('[data-select]').click();await page.reload();
   assert.equal(await page.locator('#im-selection-count').textContent(),'1 selected');
   await page.fill('[name=query]','does not exist anywhere');assert.equal(await page.locator('.im-row:visible').count(),0);assert.equal(await page.locator('#im-empty').isVisible(),true);
   await page.evaluate(()=>location.hash='2048-ventures');await page.locator('#im-deep-link-status:not([hidden])').waitFor();assert.equal(await page.locator('[id="2048-ventures"]').getAttribute('open'),'');
   await page.locator('#im-filters button[type=reset]').click();assert.equal(await page.locator('[name=query]').inputValue(),'');
   // The explicit request carries the public brief to the existing form.
   await page.locator('#im-shortlist [data-request]').click();await page.locator('#investor-handoff-notice').waitFor();
   assert.ok((await page.locator('#lead-audience').inputValue()).includes('2048 Ventures'));
   await page.fill('#lead-website','https://example.com');await page.fill('#lead-name','Local QA');await page.fill('#lead-email','qa@example.com');
   let submitted;
   await page.route('**/api/open/leads',async route=>{submitted=route.request().postDataJSON();await route.fulfill({status:500,contentType:'application/json',body:'{"received":false}'});});
   await page.locator('#campaign-enquiry button[type=submit]').click();await page.locator('#enquiry-status.is-error').waitFor();assert.equal(await page.locator('#campaign-enquiry').isVisible(),true);assert.ok(submitted.audience.includes('2048 Ventures'));assert.ok((await page.locator('#lead-audience').inputValue()).includes('2048 Ventures'));
   await page.unroute('**/api/open/leads');await page.route('**/api/open/leads',route=>route.fulfill({status:200,contentType:'application/json',body:'{"received":true}'}));
   await page.locator('#campaign-enquiry button[type=submit]').click();await page.locator('#enquiry-success:not([hidden])').waitFor();
   assert.deepEqual(errors,[]);await page.close();
  }
  const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});await nojs.goto(origin+'/investors/');assert.ok(await nojs.locator('.im-row').count()>=22);assert.equal(await nojs.locator('#im-filters').isVisible(),false);await nojs.locator('[id="2048-ventures"] summary').click();assert.equal(await nojs.locator('[id="2048-ventures"] .im-profile-body').isVisible(),true);await nojs.close();
  const blocked=await browser.newPage();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));await blocked.goto(origin+'/investors/');await blocked.locator('[data-select="2048-ventures"]').click();assert.equal(await blocked.locator('#im-selection-count').textContent(),'1 selected');assert.ok((await blocked.locator('#im-storage-status').textContent()).includes('cannot save'));await blocked.close();
  const stale=await browser.newPage();await stale.addInitScript(()=>localStorage.setItem('coin-investor-shortlist-v1',JSON.stringify({version:1,ids:['deleted','2048-ventures']})));await stale.goto(origin+'/investors/');assert.equal(await stale.locator('#im-selection-count').textContent(),'1 selected');await stale.close();
  const many=await browser.newPage();
  // Synthetic records exist only in an intercepted local QA response, never in source or a release.
  await many.route('**/investors/',async route=>{const response=await route.fetch();let html=await response.text();const original=JSON.parse(html.match(/<script type="application\/json" id="im-data">([\s\S]*?)<\/script>/)[1]);const p=original.find(p=>p.id==='2048-ventures');const row=html.match(/<article class="im-row" data-investor="2048-ventures">[\s\S]*?<\/article>/)[0];const fixtures=Array.from({length:35},(_,i)=>({...p,id:`qa-${i}`,slug:`qa-${i}`,displayName:`QA firm ${i}`}));html=html.replace('id="im-results">','id="im-results">'+fixtures.map(f=>row.replaceAll('2048-ventures',f.id).replaceAll('2048 Ventures',f.displayName)).join(''));html=html.replace(/(<script type="application\/json" id="im-data">)[\s\S]*?(<\/script>)/,(_,a,b)=>a+JSON.stringify([...original,...fixtures])+b);await route.fulfill({response,body:html});});
  await many.goto(origin+'/investors/');await many.locator('#im-pagination:not([hidden])').waitFor();assert.equal(await many.locator('.im-row:visible').count(),25);await many.locator('#im-next').click();assert.ok((await many.locator('#im-page-number').textContent()).startsWith('Page 2'));await many.fill('[name=query]','2048');assert.ok((await many.locator('#im-page-number').textContent()).startsWith('Page 1'));await many.locator('button[type=reset]').click();
  await many.evaluate(()=>{for(const b of [...document.querySelectorAll('[data-select]')].slice(0,21))b.click();});assert.equal(await many.locator('#im-selection-count').textContent(),'20 selected');await many.close();
  for(const width of [390,1440]){const home=await browser.newPage({viewport:{width,height:width===390?844:900}});await home.goto(origin+'/');assert.equal(await home.locator('#investor-match-link a').getAttribute('href'),'/investors/');await home.locator('#investor-match-link').scrollIntoViewIfNeeded();assert.ok(await home.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await home.screenshot({path:path.join(output,`${width}-homepage-link.png`)});await home.close();}
  console.log('Chromium 390/768/1440: layout, filters, reset, pagination, deep links, shortlist limit/persistence, blocked storage, no-JS profiles and mocked form error/success passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
