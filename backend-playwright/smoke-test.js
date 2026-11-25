// Smoke test: starts the server, submits a URL, then polls the job endpoint
// until the async analysis finishes.
require('./index.js')

const BASE = 'http://127.0.0.1:4000'

async function postLink(link) {
  const res = await fetch(`${BASE}/api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ link })
  })
  return { status: res.status, body: await res.json() }
}

async function pollJob(jobId, timeoutMs = 180000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const res = await fetch(`${BASE}/api/jobs/${jobId}`)
    const body = await res.json()
    if (body.status !== 'processing') return body
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('timed out waiting for job')
}

async function run() {
  await new Promise((r) => setTimeout(r, 2000))

  const health = await fetch(`${BASE}/healthz`)
  console.log('HEALTH:', health.status, await health.text())

  const link = process.argv[2] || 'https://example.com'
  const created = await postLink(link)
  console.log('POST STATUS:', created.status, JSON.stringify(created.body))

  if (created.status !== 202) throw new Error('expected 202 from POST /api')

  const job = await pollJob(created.body.jobId)
  console.log('JOB:', JSON.stringify(job, null, 2))

  process.exit(job.status === 'done' ? 0 : 1)
}

run().catch((err) => {
  console.error('SMOKE TEST FAILED:', err)
  process.exit(1)
})
