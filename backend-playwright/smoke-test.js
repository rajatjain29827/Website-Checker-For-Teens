// Smoke test: loads index.js (starts the server on :4000), then calls /api
// with a real URL to verify the whole Playwright scraping flow end-to-end.
require('./index.js')

async function run(){
  // give express a moment to listen
  await new Promise(r => setTimeout(r, 3000))

  const res = await fetch('http://127.0.0.1:4000/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'link=https://example.com'
  })
  console.log('SMOKE STATUS:', res.status)
  const body = await res.text()
  console.log('SMOKE BODY:', body)
  process.exit(0)
}

run().catch(err => { console.error('SMOKE TEST FAILED:', err); process.exit(1) })