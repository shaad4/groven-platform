const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox']});
 const results=[];
 for(let i=0;i<6;i++) for(const variant of ['before','after']) {
  const port=variant==='before'?58081:58082;
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.route('**/*', route=> {
    const u=new URL(route.request().url());
    if(u.hostname!=='localhost') return route.abort();
    if(u.pathname === '/tenants/info/') return route.fulfill({status:404,contentType:'application/json',body:'{}'});
    if(u.pathname.includes('/auth/')) return route.fulfill({status:401,contentType:'application/json',body:'{"success":false}'});
    return route.continue();
  });
  const cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:200000,uploadThroughput:100000});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.addInitScript(()=>new PerformanceObserver(list=>window.__lcp=list.getEntries().at(-1).startTime).observe({type:'largest-contentful-paint',buffered:true}));
  await page.goto(`http://localhost:${port}/login`,{waitUntil:'networkidle'});
  await page.getByRole('button', {name:'Sign in', exact:true}).waitFor();
  if(errors.length) throw new Error(errors.join('; '));
  results.push(await page.evaluate(({variant,i,errors})=>({variant,run:i+1,errors,title:document.title,text:document.body.innerText.slice(0,120),fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,lcp:window.__lcp,domContentLoaded:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,assetBytes:performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/')).reduce((n,r)=>n+r.transferSize,0)}),{variant,i,errors}));
  await context.close();
 }
 await browser.close(); console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
