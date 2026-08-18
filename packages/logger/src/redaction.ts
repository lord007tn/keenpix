import type { RedactConfig } from 'evlog'

export const KEENPIX_REDACTION_PATHS = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'password',
  'passcode',
  'secret',
  'hashedPassword',
  'token',
  '*_token',
  '*Token',
  'apiKey',
  'x-api-key',
  'x-auth-token',
  'clientSecret',
  'client_secret',
  'email',
  'phone',
  'iban',
  'recipient',
  'cardNumber',
  'card_number',
  'cvv',
  'ssn',
]

export const KEENPIX_REDACTION_PATTERNS = [
  /\b(?:authorization|proxy-authorization|cookie|set-cookie|password|passcode|secret|client[_-]?secret|access[_-]?token|refresh[_-]?token|id[_-]?token|token|api[_-]?key|x-api-key)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;&]+)/gi,
  /\bbearer\s+[\w\-.~+/]{8,}=*/gi,
  /\beyJ[\w-]*\.[\w-]*\.[\w-]*\b/g,
  /\b(?:\d[\s-]*?){13,19}\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b[A-Z]{2}\d{2}[\s-]?[\dA-Z]{4}[\s-]?[\dA-Z]{4}[\s-]?[\dA-Z]{4}(?:[\s-]?[\dA-Z]{0,4}){0,3}\b/g,
  /(?:\+\d{1,3}[\s.-]?\(?\d{1,4}\)?|\(\d{1,4}\))(?:[\s.-]?\d{2,4}){2,4}\b/g,
  /\b\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/g,
  /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  /\b\d{3}-\d{2}-\d{4}\b/g,
]

export const KEENPIX_REDACTION = {
  builtins: ['bearer', 'creditCard', 'email', 'iban', 'ipv4', 'jwt', 'phone'],
  paths: KEENPIX_REDACTION_PATHS,
  patterns: KEENPIX_REDACTION_PATTERNS,
} satisfies RedactConfig
