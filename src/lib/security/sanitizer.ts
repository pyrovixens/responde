// ============================================================================
// RESPONDE — Security Input Sanitizer & Anti-Injection Guard
// Strips dangerous tags, control characters, and malicious payloads
// ============================================================================

/**
 * Sanitizes generic user text input (descriptions, caller names, notes).
 * Removes raw HTML tags, script delimiters, and null bytes.
 */
export function sanitizeTextInput(input: string | undefined | null, maxLength: number = 2000): string {
  if (!input) return '';

  return input
    .replace(/\0/g, '') // Remove null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/javascript:/gi, '') // Strip JS pseudo-protocol
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates that an identifier matches safe alphanumeric/dash patterns (prevents path traversal / SQL wildcard injection).
 */
export function isSafeIdentifier(id: string | undefined | null): boolean {
  if (!id) return false;
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

/**
 * List of known automated vulnerability scanners and malicious bot user-agents.
 */
export const MALICIOUS_USER_AGENTS = [
  'sqlmap',
  'nikto',
  'dirbuster',
  'gobuster',
  'wpscan',
  'acunetix',
  'nessus',
  'nmap',
  'masscan',
  'havij',
  'openvas',
];

export function isMaliciousUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return MALICIOUS_USER_AGENTS.some((bot) => ua.includes(bot));
}
