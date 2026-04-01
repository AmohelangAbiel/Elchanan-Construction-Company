import { sanitizeText } from './sanitize';

const defaultBannedTerms = ['spamlink', 'casino', 'forex-scam'];

function getBannedTerms() {
  const envValue = process.env.BANNED_TERMS || '';
  const fromEnv = envValue
    .split(',')
    .map((term) => sanitizeText(term, 80).toLowerCase())
    .filter(Boolean);

  return [...new Set([...defaultBannedTerms, ...fromEnv])];
}

export function containsBlockedLanguage(input: string) {
  const body = sanitizeText(input, 5000).toLowerCase();
  const bannedTerms = getBannedTerms();
  return bannedTerms.some((term) => body.includes(term));
}
