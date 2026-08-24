// ============================================================================
// RESPONDE — In-Memory & Header-based Sliding Window Rate Limiter
// Prevents Denial of Service (DoS), Brute-Force, and API credential stuffing
// ============================================================================

interface RateLimitRecord {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitOptions {
  limit?: number; // Maximum requests allowed within window
  windowMs?: number; // Time window in milliseconds
  blockDurationMs?: number; // Duration to block if limit exceeded
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
  isBlocked?: boolean;
} {
  const limit = options.limit || 60;
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const blockDurationMs = options.blockDurationMs || 5 * 60 * 1000; // 5 minutes block
  const now = Date.now();

  // Periodic cleanup of expired records (prevent memory leaks)
  if (rateLimitStore.size > 5000) {
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.resetAt < now && (!record.blockedUntil || record.blockedUntil < now)) {
        rateLimitStore.delete(key);
      }
    }
  }

  const record = rateLimitStore.get(identifier);

  // Check if currently blocked
  if (record?.blockedUntil && record.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: record.blockedUntil - now,
      isBlocked: true,
    };
  }

  // If no record or expired window, start fresh window
  if (!record || record.resetAt <= now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInMs: windowMs,
    };
  }

  // Within window: increment count
  record.count += 1;

  if (record.count > limit) {
    // Trigger temporary block
    record.blockedUntil = now + blockDurationMs;
    return {
      allowed: false,
      remaining: 0,
      resetInMs: blockDurationMs,
      isBlocked: true,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - record.count),
    resetInMs: record.resetAt - now,
  };
}
