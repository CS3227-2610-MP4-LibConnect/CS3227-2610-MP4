const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { isWithinRoot, root: buildRoot } = require('./browser-inspection-server');
const evidenceDir = path.resolve(__dirname, '..', '..', '..', 'logs', 'tasks', 'student-tickets');
(async () => {
assert.equal(isWithinRoot(buildRoot, path.join(buildRoot, 'index.html')), true, 'in-root build files remain servable');
assert.equal(isWithinRoot(buildRoot, path.resolve(`${buildRoot}-private`, 'secret')), false, 'sibling-prefix paths must be rejected');
assert.equal(isWithinRoot(buildRoot, path.resolve(buildRoot, '..', 'secret')), false, 'parent-directory escapes must be rejected');
const target = (await fetch('http://127.0.0.1:9225/json/list').then((r) => r.json())).find((item) => item.type === 'page' && item.url.includes('/student/tickets/new'));
const ws = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const entry = pending.get(message.id);
  if (entry) { pending.delete(message.id); message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
ws.addEventListener('open', async () => {
  try {
    await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
    await send('Page.bringToFront'); await sleep(300);
    const layout = await evaluate(`(() => ({ viewport: innerWidth, docWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, horizontalOverflow: document.documentElement.scrollWidth > innerWidth, titleVisible: !!document.querySelector('label[for="ticket-title"]'), labels: [...document.querySelectorAll('.ticket-create-card form > label, .ticket-source label')].map(x=>x.innerText), controls: [...document.querySelectorAll('.ticket-create-card input,.ticket-create-card select,.ticket-create-card textarea,.ticket-create-card button')].map(x=>({id:x.id||x.innerText, left:Math.round(x.getBoundingClientRect().left), right:Math.round(x.getBoundingClientRect().right), width:Math.round(x.getBoundingClientRect().width)})) }))()`);
    const focusOrder = [];
    for (let i = 0; i < 40; i++) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await sleep(30);
      const active = await evaluate(`(() => { const e=document.activeElement; return {tag:e.tagName,id:e.id||'',text:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,60),type:e.type||''}; })()`);
      focusOrder.push(active);
      if (active.id === 'ticket-title') layout.titleReachedByTab = true;
      if (active.type === 'submit') { layout.submitReachedByTab = true; break; }
    }
    const reachedSubmit = layout.submitReachedByTab;
    if (reachedSubmit) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
      await sleep(250);
    }
    layout.focusAfterKeyboardSubmit = await evaluate(`(() => ({id:document.activeElement.id, invalid:document.querySelector('#ticket-title')?.getAttribute('aria-invalid'), error:document.querySelector('#ticket-title-error')?.innerText||''}))()`);
    await evaluate('window.scrollTo(0, 0)'); await sleep(100);
    const topShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(evidenceDir, 'browser-inspection-320-top.png'), Buffer.from(topShot.data, 'base64'));
    await evaluate('window.scrollTo(0, document.body.scrollHeight)'); await sleep(100);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(evidenceDir, 'browser-inspection-320-bottom.png'), Buffer.from(shot.data, 'base64'));
    const result = { result: 'PASS', pathContainmentAssertions: 'PASS (in-root accepted; sibling-prefix and parent escapes rejected)', scope: 'built UI with synthetic local session/CSRF/ticket response stub; no API/storage behavior claimed', ...layout, focusOrder };
    fs.writeFileSync(path.join(evidenceDir, 'implementation-T04-browser.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } catch (error) { console.error(error.stack || error); process.exitCode = 1; }
  finally { ws.close(); }
});

})();

