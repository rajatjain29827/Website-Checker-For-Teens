// Isolation script: steps through the exact same calls as getData() in index.js
// with short timeouts, logging after every step to find where it hangs.
const { chromium } = require('playwright');
const cheerio = require('cheerio');

(async () => {
  const b = await chromium.launch({ headless: true });
  console.log('1 launched');
  const p = await b.newPage();
  p.setDefaultTimeout(15000);
  p.setDefaultNavigationTimeout(15000);

  await p.goto('https://example.com');
  console.log('2 goto done');
  await p.waitForSelector('body');
  console.log('3 waitForSelector body done');
  await p.waitForLoadState('networkidle');
  console.log('4 waitForLoadState networkidle #1 done');
  const title = await p.title();
  console.log('5 title:', title);
  const content = await p.content();
  console.log('6 page.content done, len', content.length);
  const html = await p.evaluate(() => document.documentElement.outerHTML);
  console.log('7 evaluate done, len', html.length);
  const $ = cheerio.load(html);
  console.log('8 cheerio.load done');
  await p.waitForLoadState('networkidle');
  console.log('9 waitForLoadState networkidle #2 done');
  await p.waitForSelector('div');
  console.log('10 waitForSelector div done');
  await p.waitForLoadState('networkidle');
  console.log('11 waitForLoadState networkidle #3 done');
  const data = $('div').text().trim();
  console.log('12 extracted text len:', data.length);
  await b.close();
  console.log('ALL DONE');
  process.exit(0);
})().catch(e => { console.error('FAILED AT:', e.message.split('\n')[0]); process.exit(1); });