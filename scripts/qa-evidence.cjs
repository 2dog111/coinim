const {chromium,webkit} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname,'../qa-screens/evidence-v2');fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:4173';
(async()=>{
 const results=[];
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true});
  try{
   for(const width of [360,390,768,1440]){
    const page=await browser.newPage({viewport:{width,height:width<700?844:900},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);await page.evaluate(()=>document.fonts.ready);
    for(const id of ['physical-approach','production','campaign-economics','campaign-faq','start']){
     await page.locator('#'+id).evaluate(el=>el.scrollIntoView({block:'start'}));
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
     await page.screenshot({path:path.join(out,`${name}-${width}-${id}.png`)});
    }
    const contribution=page.locator('#customer-contribution'),other=page.locator('#other-costs');
    assert.equal(await contribution.inputValue(),'');
    await contribution.fill('1000');assert.match(await page.locator('#cost-result').innerText(),/4 additional/);
    await page.locator('#cost-campaign').selectOption('scale');assert.match(await page.locator('#cost-result').innerText(),/30 additional/);
    await other.fill('1000');assert.match(await page.locator('#cost-result').innerText(),/31 additional/);
    await page.locator('#cost-campaign').selectOption('pilot');assert.match(await page.locator('#cost-result').innerText(),/5 additional/);
    await contribution.fill('0');assert.equal(await page.locator('#contribution-error').isVisible(),true);
    await contribution.fill('');assert.match(await page.locator('#cost-result').innerText(),/Enter your contribution/);
    await page.locator('[data-plan=pilot]').first().click();assert.equal(await page.locator('#lead-interest').inputValue(),'pilot');
    await page.locator('[data-plan=scale]').first().click();assert.equal(await page.locator('#lead-interest').inputValue(),'scale');
    await page.locator('.hero a[href="#start"]').click();assert.equal(await page.locator('#lead-interest').inputValue(),'scale');
    await page.locator('#lead-interest').selectOption('help');
    assert.deepEqual(await page.locator('.enquiry-fields input').evaluateAll(inputs=>inputs.map(x=>x.name)),['website','name','work_email']);
    await page.locator('#lead-website').fill('example.com');await page.locator('#lead-name').fill('Local QA');
    await page.locator('#lead-email').fill('qa@example.com');
    assert.equal(await page.locator('#lead-website').inputValue(),'https://example.com');
    assert.equal(await page.locator('#campaign-enquiry').evaluate(el=>el.checkValidity()),true);
    await page.locator('.contact-preferences > summary').click();
    await page.getByRole('radio',{name:'SMS',exact:true}).check();
    assert.equal(await page.locator('#lead-phone').evaluate(el=>el.required),true);
    assert.equal(await page.locator('#campaign-enquiry').evaluate(el=>el.checkValidity()),false);
    await page.getByRole('radio',{name:'Email',exact:true}).check();
    assert.equal(await page.locator('#lead-phone').evaluate(el=>el.required),false);
    await page.locator('.contact-preferences > summary').click();
    await page.locator('#lead-website').focus();await page.keyboard.press('Tab');
    assert.equal(await page.locator('#lead-name').evaluate(el=>el===document.activeElement),true);
    const failure=route=>route.fulfill({status:503,contentType:'application/json',body:'{"received":false}'});
    await page.route('**/api/open/leads',failure,{times:1});
    await page.getByRole('button',{name:'Send my website',exact:true}).click();
    await page.locator('#enquiry-status.is-error').waitFor();
    assert.match(await page.locator('#enquiry-status').innerText(),/could not confirm/);
    assert.equal(await page.locator('#lead-email').inputValue(),'qa@example.com');
    await page.unroute('**/api/open/leads',failure);
    // Never create production or external leads. One real local write per browser.
    if(width===390){
     const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/open/leads'));
     await page.getByRole('button',{name:'Send my website',exact:true}).click();
     const response=await responsePromise;assert.equal(response.status(),201);
     const payload=response.request().postDataJSON();assert.equal(payload.website,'https://example.com');assert.equal(payload.campaign_interest,'help');assert.equal(payload.phone,'');
     await page.getByRole('heading',{name:'Your website is with us.'}).waitFor();
     assert.equal(await page.locator('#enquiry-success').evaluate(el=>el===document.activeElement),true);
    }
    assert.deepEqual(errors,[]);results.push({browser:name,width,passed:true});await page.close();
   }
   // A real 25-second timeout may follow a committed server write. Retry stays idempotent.
   if(name==='chromium'){
    const page=await browser.newPage();await page.goto(base);
    await page.locator('#lead-website').fill('example.com');await page.locator('#lead-name').fill('Local timeout QA');await page.locator('#lead-email').fill('qa@example.com');
    let sent;const handler=async route=>{sent=route.request().postDataJSON();await route.fetch(); /* let the browser request time out after server receipt */};
    await page.route('**/api/open/leads',handler,{times:1});
    await page.getByRole('button',{name:'Send my website',exact:true}).click();
    await page.locator('#enquiry-status.is-error').waitFor({timeout:30000});
    assert.match(await page.locator('#enquiry-status').innerText(),/could not confirm/);
    await page.unroute('**/api/open/leads',handler);
    const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/open/leads'));
    await page.getByRole('button',{name:'Send my website',exact:true}).click();
    const response=await responsePromise;assert.equal(response.status(),201);assert.equal(response.request().postDataJSON().request_id,sent.request_id);
    await page.getByRole('heading',{name:'Your website is with us.'}).waitFor();
   }
  }finally{await browser.close();}
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
