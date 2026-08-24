import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Generates HMAC-SHA256 signature for API requests.
 * Canonical string format: `${method.toUpperCase()}|${path}|${timestamp}|${nonce}|${body}`
 */
export function generateHmacSignature(
  method: string,
  path: string,
  timestamp: string | number,
  nonce: string,
  body: string,
  secret: string
): string {
  const canonicalString = `${method.toUpperCase()}|${path}|${timestamp}|${nonce}|${body}`;
  return createHmac('sha256', secret).update(canonicalString, 'utf8').digest('hex');
}

/**
 * Validates HMAC signature with constant-time equality check to prevent timing attacks.
 */
export function verifyHmacSignature(
  receivedSignature: string,
  method: string,
  path: string,
  timestamp: string | number,
  nonce: string,
  body: string,
  secret: string
): boolean {
  try {
    const expectedSignature = generateHmacSignature(method, path, timestamp, nonce, body, secret);
    const receivedBuffer = Buffer.from(receivedSignature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Validates that the request timestamp is within tolerance window (default 5 minutes = 300,000 ms)
 * to prevent replay attacks.
 */
export function verifyTimestamp(
  timestamp: string | number,
  toleranceMs: number = 5 * 60 * 1000,
  currentTimestampMs: number = Date.now()
): { valid: boolean; reason?: string } {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;

  if (isNaN(ts)) {
    return { valid: false, reason: 'Invalid timestamp format. Must be Unix epoch in milliseconds.' };
  }

  const diff = Math.abs(currentTimestampMs - ts);
  if (diff > toleranceMs) {
    return {
      valid: false,
      reason: `Timestamp is skewed by ${Math.round(diff / 1000)}s. Maximum allowed skew is ${Math.round(
        toleranceMs / 1000
      )}s.`,
    };
  }

  return { valid: true };
}

// In-memory Nonce Cache with TTL for fast verification
const nonceMemoryCache = new Map<string, number>();

/**
 * Validates and stores nonce to prevent replay attacks.
 */
export function verifyAndStoreNonce(
  keyPrefix: string,
  nonce: string,
  timestampMs: number,
  ttlMs: number = 10 * 60 * 1000
): boolean {
  if (!nonce || nonce.length < 8) return false;

  // Cleanup expired nonces
  const now = Date.now();
  for (const [k, exp] of nonceMemoryCache.entries()) {
    if (exp < now) {
      nonceMemoryCache.delete(k);
    }
  }

  const cacheKey = `${keyPrefix}:${nonce}`;
  if (nonceMemoryCache.has(cacheKey)) {
    return false; // Replay detected!
  }

  nonceMemoryCache.set(cacheKey, now + ttlMs);
  return true;
}
