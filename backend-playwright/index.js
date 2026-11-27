require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const { chromium } = require('playwright');
const bodyParser = require('body-parser');
const cors = require('cors');
const cheerio = require('cheerio');
const axios = require('axios');
const { redactPII } = require('./pii');

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const PORT = process.env.PORT || 4000;
const JOB_TTL_MS = 60 * 60 * 1000; // forget finished jobs after an hour
const jobs = new Map();

const stopwords = [
  "a","an","the","and","or","but","if","then","else","when","while","for","to","of","in","on","at",
  "by","with","about","against","between","into","through","during","before","after","above","below",
  "from","up","down","out","over","under","again","further","more","most","some","such","no","nor",
  "not","only","own","same","so","than","too","very","can","will","just","should","could","would",
  "is","are","was","were","be","been","being","have","has","had","do","does","did","as","that","this",
  "these","those","he","she","it","they","them","his","her","its","their","we","us","you","your","yours",
  "i","me","my","mine","what","which","who","whom","whose","where","when","why","how","also","because",
  "there","here","than","per","each","every","either","neither","much","many","few","several","whatsoever",
  "any","both","other","others","another","such","thus","hence","upon",
  "must","shall","may","might","ought","let","lets","oughtn't","shan't","mustn't",
  "also","yet","nor","elsewhere","whereas","wherever","whenever","whither","whence",
  "per","via","amid","among","along","plus","minus","except","excluding","including",
  "regarding","concerning","versus","vs","albeit","alot","okay","ok","okay","okey",
  "i'm","you're","he's","she's","it's","we're","they're","i've","you've","we've","they've",
  "i'd","you'd","he'd","she'd","we'd","they'd","i'll","you'll","he'll","she'll","we'll","they'll",
  "ain't","can't","don't","doesn't","didn't","won't","wouldn't","couldn't","shouldn't","isn't","aren't",
  "please","thanks","thank","thanks","welcome","okay","ok","yeah","yes","nope","no","nah","hmm","huh"
];

// Kept as the offline fallback when every moderation API is unavailable.
const inappropriateKeywords = [
  "gore", "snuff", "beheading", "torture", "kill", "suicide", "selfharm", "self-harm", "harm",
  "cutting", "heroin", "cocaine", "meth", "weed", "pill", "drug", "bomb", "explosive", "gun",
  "weapon", "ak47", "parts", "schematics", "hack", "crack", "piracy", "torrent", "steal", "fraud",
  "creditcard", "generator", "casino", "slots", "betting", "poker", "bet", "trafficking",
  "exploitation", "recruitment", "terror", "extremist", "arms", "firearms", "rifle"
];

// ---------------------------------------------------------------------------
// Job endpoints (keeps every HTTP request short enough for Render's timeout)
// ---------------------------------------------------------------------------

app.get('/healthz', (req, res) => res.status(200).send('ok'));

app.post('/api', (req, res) => {
  const link = req.body?.link;

  if (!link) return res.status(400).json({ error: 'link required' });

  let parsed;
  try {
    parsed = new URL(link);
  } catch {
    return res.status(400).json({ error: 'invalid link' });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'invalid link' });
  }

  const id = crypto.randomUUID();
  jobs.set(id, { status: 'processing', createdAt: Date.now() });

  // Answer immediately; the scrape + LLM work happens out of band.
  res.status(202).json({ jobId: id });
  processJob(id, link);
});

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'job not found' });

  const { createdAt, ...payload } = job;
  res.json(payload);
});

setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
}, 10 * 60 * 1000).unref?.();

async function processJob(id, link) {
  const job = jobs.get(id) || { createdAt: Date.now() };

  try {
    const text = await scrapeText(link);
    if (!text) throw new Error('no readable text found on the page');

    const fullWords = getAllWords(text);
    const { redacted, detections } = await redactPII(text);
    const topWords = getTopWords(fullWords);
    const result = await classify(text, topWords, fullWords);

    result.pii = {
      redacted: detections.length,
      types: [...new Set(detections.map((d) => d.type))]
    };

    job.status = 'done';
    job.result = result;
  } catch (err) {
    console.error('job failed', id, err.message);
    jobs.set(id, {
      ...job,
      status: 'error',
      error: `Analysis failed: ${err.message}`.slice(0, 300)
    });
  }
}

// ---------------------------------------------------------------------------
// Scraping
// ---------------------------------------------------------------------------

async function scrapeText(link) {
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(45000);

    await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('body', { timeout: 15000 });

    // Best-effort: never fail the job just because the network never settles.
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const html = await page.content();
    const $ = cheerio.load(html);
    return $('body').text().replace(/\s+/g, ' ').trim();
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

function getTopWords(text) {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word && !stopwords.includes(word));

  const counts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50);
}

// All words found in the text (after lowercasing and removing stopwords).
function getAllWords(text) {
  const words = text
    .toLowerCase()
    .split(/[\s,\.!?;:]+/)
    .filter((word) => word && !stopwords.includes(word));
  return words;
}

// ---------------------------------------------------------------------------
// Moderation providers (one free account each, used in order)
// ---------------------------------------------------------------------------

const providerState = {
  hf: { last429: null, cooldownMs: 60000 },
  groq: { last429: null, cooldownMs: 60000 },
  gemini: { last429: null, cooldownMs: 60000 }
};

function isInCooldown(provider) {
  const state = providerState[provider];
  return Boolean(state.last429) && Date.now() - state.last429 < state.cooldownMs;
}

function markCooldown(provider) {
  providerState[provider].last429 = Date.now();
}

function hasKey(provider) {
  if (provider === 'hf') return Boolean(process.env.HF_API_KEY);
  if (provider === 'groq') return Boolean(process.env.GROQ_API_KEY);
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY);
  return false;
}

async function classify(text, topWords, fullWords) {
  const prompt = buildSafetyPrompt(text, topWords, fullWords);

  for (const provider of ['hf', 'groq', 'gemini']) {
    if (!hasKey(provider) || isInCooldown(provider)) continue;

    try {
      const result = await callProvider(provider, prompt);
      const normalized = normalizeResult(result);
      if (normalized) return normalized;
    } catch (err) {
      if (err.status === 429 || err.response?.status === 429) markCooldown(provider);
      console.warn(`provider ${provider} failed:`, err.response?.status || err.message);
    }
  }

  return keywordFallback(text, topWords, fullWords);
}

async function callProvider(provider, prompt) {
  const { HF_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, HF_MODEL, GROQ_MODEL, GEMINI_MODEL } = process.env;

  if (provider === 'hf') {
    const res = await axios.post(
      `https://api-inference.huggingface.co/models/${HF_MODEL || 'unitary/toxic-bert'}`,
      { inputs: prompt, options: { wait_for_model: true } },
      { headers: { Authorization: `Bearer ${HF_API_KEY}` }, timeout: 25000 }
    );

    if (res.data?.error) throw new Error(res.data.error);

    const labels = (Array.isArray(res.data?.[0]) ? res.data[0] : res.data) || [];
    const flags = labels
      .filter((item) => item && item.score > 0.6 && !/non[-_]?toxic|neutral/i.test(item.label || ''))
      .map((item) => item.label);

    return {
      safe: flags.length === 0,
      flags: flags,
      reason: flags.length ? `Toxicity labels: ${flags.join(', ')}` : 'No toxic labels detected',
      details: { labels }
    };
  }

  if (provider === 'groq') {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: GROQ_MODEL || 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a strict content-safety classifier. Reply with JSON only.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0
      },
      { headers: { Authorization: `Bearer ${GROQ_API_KEY}` }, timeout: 25000 }
    );

    return JSON.parse(res.data.choices[0].message.content);
  }

  if (provider === 'gemini') {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL || 'gemini-1.5-flash'}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' }
      },
      { timeout: 25000 }
    );

    const content = res.data.candidates[0].content.parts[0].text;
    return JSON.parse(stripJsonFence(content));
  }

  throw new Error(`unknown provider ${provider}`);
}

function stripJsonFence(text) {
  return String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
}

function normalizeResult(result) {
  if (!result || typeof result !== 'object') return null;
  if (typeof result.safe !== 'boolean' && !Array.isArray(result.flags)) return null;

  const flags = Array.isArray(result.flags) ? result.flags : [];
  return {
    safe: typeof result.safe === 'boolean' ? result.safe : flags.length === 0,
    flags,
    reason: typeof result.reason === 'string' ? result.reason : '',
    details: result.details && typeof result.details === 'object' ? result.details : {}
  };
}

function keywordFallback(text, topWords, fullWords) {
  const tokens = new Set(fullWords.toLowerCase().split(/[^a-z0-9'-]+/));
  const matched = inappropriateKeywords.filter((keyword) => tokens.has(keyword));

  if (matched.length === 0) {
    return { safe: true, flags: [], reason: 'No harmful keywords found', details: { source: 'keyword-fallback' } };
  }

  return {
    safe: false,
    flags: ['keyword-match'],
    reason: `Matched harmful keywords: ${matched.join(', ')}`,
    details: { source: 'keyword-fallback', matched }
  };
}

function buildSafetyPrompt(text, topWords, fullWords) {
  const excerpt = text.slice(0, 12000);
  const wordCount = Array.isArray(fullWords) ? fullWords.length : 0;
  const topWordList = Array.isArray(topWords) ? topWords : [];

  const wordsJson = JSON.stringify(topWordList);

  return `Analyse the following chat/website transcript for harmful content.

Detect these categories (flag only what is clearly present):
- self_harm: suicide, self-harm, cutting, encouraging self-injury
- violence: threats, gore, weapons, instructions to harm
- hate: hate speech or dehumanising groups
- harassment: bullying, threats, targeted abuse
- sexual: sexually explicit content
- drugs: illegal drugs or misuse
- profanity: strong profanity
- psychosis: delusional or reality-breaking claims presented as fact (for example an AI claiming to be sentient, divine or all-powerful; paranoid conspiracies; hallucinated events presented as real; disordered thinking)

Keywords that may indicate harm (not exhaustive): ${inappropriateKeywords.join(', ')}

Words scanned from the webpage (top ${topWordList.length}): ${wordsJson}

Text:
"""${excerpt}"""

Respond with JSON only, no markdown:
{
  "safe": true or false,
  "flags": ["self_harm", "violence", "..."],
  "reason": "one short sentence",
  "details": { "self_harm": { "detected": false, "confidence": 0, "matched_keywords": [] } }
}`;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

