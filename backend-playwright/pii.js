// PII redaction layer.
//
// We intentionally whitelist only *structured* identifiers (emails, phones,
// cards, IPs, secrets). We do NOT enable the NAME/NER pass: it is unreliable
// here and, worse, it redacts safety-relevant phrases (e.g. "Kill yourself"
// was detected as a NAME), which would erase the very content we classify.
const { OpenRedaction } = require('openredaction');

const PII_PATTERNS = [
  'EMAIL',
  'PHONE_US',
  'PHONE_INTERNATIONAL',
  'CREDIT_CARD',
  'SSN',
  'IBAN',
  'IPV4',
  'IPV6',
  'URL_WITH_AUTH',
  'AWS_ACCESS_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_API_KEY',
  'GITHUB_TOKEN',
  'JWT_TOKEN',
  'BEARER_TOKEN',
  'PRIVATE_KEY',
  'GENERIC_API_KEY',
];

const redactor = new OpenRedaction({
  redactionMode: 'placeholder',
  enableNER: false,
  patterns: PII_PATTERNS,
  confidenceThreshold: 0.3,
});

async function redactPII(text) {
  if (!text) return { redacted: '', detections: [] };

  try {
    const result = await redactor.detect(text);
    return {
      redacted: result.redacted,
      detections: result.detections || [],
    };
  } catch (err) {
    // Never block the safety check because redaction failed.
    console.warn('PII redaction failed, continuing with raw text:', err.message);
    return { redacted: text, detections: [] };
  }
}

module.exports = { redactPII };
