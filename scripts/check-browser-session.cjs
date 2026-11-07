// Local HTTPS fixture only: real API cookies/JWTs/WebSockets, no production URLs.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = 'https://check.groven.localhost:59443';
async function until(predicate, timeout = 25000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Local session check timed out');
}
(async () => {
  assert(process.env.GROVEN_BROWSER_SPKI, 'Trust fingerprint of local TLS fixture is required');
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium', headless:true,
    args:['--no-sandbox', '--host-resolver-rules=MAP *.groven.localhost 127.0.0.1, MAP groven.localhost 127.0.0.1',
          `--ignore-certificate-errors-spki-list=${process.env.GROVEN_BROWSER_SPKI}`]});
  try {
    const context = await browser.newContext({serviceWorkers:'block'});
    const page = await context.newPage();
    const refreshStatuses = [], sockets = [], socketTokens = [], selectedProtocols = [], errors = [];
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    cdp.on('Network.webSocketWillSendHandshakeRequest', event => {
      const entry = Object.entries(event.request.headers).find(([name]) => name.toLowerCase() === 'sec-websocket-protocol');
      const auth = entry?.[1].split(',').map(value => value.trim()).find(value => value.startsWith('groven.auth.'));
      if (auth) socketTokens.push(auth.slice('groven.auth.'.length));
    });
    cdp.on('Network.webSocketHandshakeResponseReceived', event => {
      const entry = Object.entries(event.response.headers).find(([name]) => name.toLowerCase() === 'sec-websocket-protocol');
      if (entry) selectedProtocols.push(entry[1]);
    });
    await page.route('**/*', route => {
      const host = new URL(route.request().url()).hostname;
      return host === 'groven.localhost' || host.endsWith('.groven.localhost') ? route.continue() : route.abort();
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().includes('/auth/token/refresh/')) refreshStatuses.push(response.status());
    });
    page.on('websocket', socket => {
      if (socket.url().includes('/ws/feed/')) {
        assert(!new URL(socket.url()).searchParams.has('token'), 'Socket URL must not carry a credential');
        sockets.push(socket.url());
      }
    });
    await page.goto(origin + '/login', {waitUntil:'networkidle'});
    const status = await page.evaluate(async () => {
      const response = await fetch('/api/auth/login/', {method:'POST', credentials:'include',
        headers:{'Content-Type':'application/json', 'X-Tenant-Slug':'check'},
        body:JSON.stringify({email:'browser-check@example.test', password:'local-browser-check-only'})});
      return response.status;
    });
    assert.equal(status, 200, 'Real login must succeed');
    const cookie = (await context.cookies()).find(c => c.name === 'provider_refresh_check');
    assert(cookie?.httpOnly && cookie.secure, 'Refresh cookie must be Secure and HttpOnly');
    assert(!(await page.evaluate(() => document.cookie)).includes('provider_refresh_check'));
    await page.goto(origin + '/dashboard', {waitUntil:'networkidle'});
    await until(() => socketTokens.length >= 2 && selectedProtocols.length >= 2 && refreshStatuses.filter(s => s === 200).length >= 2);
    assert.notEqual(socketTokens[0], socketTokens[1], 'Expiry must reconnect with a new JWT');
    assert(selectedProtocols.every(protocol => protocol === 'groven.v1'), 'Server must never echo a bearer token');
    assert(page.url().includes('/dashboard'), 'Session must remain authenticated');
    const successfulRefreshes = refreshStatuses.filter(s => s === 200).length;
    const deniedBefore = refreshStatuses.filter(s => s === 401).length;
    await context.clearCookies();
    await until(() => page.url().endsWith('/login') && refreshStatuses.filter(s => s === 401).length > deniedBefore);
    assert(refreshStatuses.includes(401), 'Expired cookie must fail refresh');
    assert.deepEqual(errors, [], 'No browser JavaScript exceptions');
    console.log(JSON.stringify({loginStatus:status, secureHttpOnlyCookie:true,
      successfulRefreshes, websocketConnections:sockets.length, tokenRotated:true, credentialsAbsentFromUrls:true,
      negotiatedProtocol:'groven.v1',
      rejectedRefreshRedirectedToLogin:true, javascriptErrors:errors}, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exit(1); });
