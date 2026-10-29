// Probe: inspect example.com DOM to see why waitForSelector('div') times out
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.goto('https://example.com');
  const info = await p.evaluate(() => ({
    divCount: document.querySelectorAll('div').length,
    bodyChildren: Array.from(document.body.children).map(e => e.tagName),
    firstDiv: (() => {
      const d = document.querySelector('div');
      if (!d) return null;
      const r = d.getBoundingClientRect();
      const cs = getComputedStyle(d);
      return { w: r.width, h: r.height, display: cs.display, visibility: cs.visibility };
    })()
  }));
  console.log(JSON.stringify(info, null, 2));
  console.log('---HTML---');
  console.log(await p.content());
  await b.close();
  process.exit(0);
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });