import { describe, it, expect } from 'vitest';
import {
  generateHmacSignature,
  verifyHmacSignature,
  verifyTimestamp,
  verifyAndStoreNonce,
} from '@/lib/security/hmac';

describe('HMAC & Anti-Replay Security Module', () => {
  const secret = 'super_secret_test_key_responde_2026';
  const method = 'POST';
  const path = '/api/v1/incidents';
  const timestamp = Date.now();
  const nonce = 'random_unique_nonce_123456';
  const body = JSON.stringify({
    location_name: 'Av. Libertador 100',
    type: 'INCENDIO_ESTRUCTURAL',
    priority: 'P1',
  });

  it('should generate a valid HMAC-SHA256 signature and verify it successfully', () => {
    const signature = generateHmacSignature(method, path, timestamp, nonce, body, secret);
    expect(signature).toBeDefined();
    expect(signature.length).toBe(64); // SHA-256 hex string

    const isValid = verifyHmacSignature(signature, method, path, timestamp, nonce, body, secret);
    expect(isValid).toBe(true);
  });

  it('should reject signature if payload body has been tampered with', () => {
    const signature = generateHmacSignature(method, path, timestamp, nonce, body, secret);
    const tamperedBody = JSON.stringify({
      location_name: 'Calle Falsa 123',
      type: 'INCENDIO_ESTRUCTURAL',
      priority: 'P1',
    });

    const isValid = verifyHmacSignature(signature, method, path, timestamp, nonce, tamperedBody, secret);
    expect(isValid).toBe(false);
  });

  it('should reject signature if secret key is incorrect', () => {
    const signature = generateHmacSignature(method, path, timestamp, nonce, body, secret);
    const isValid = verifyHmacSignature(signature, method, path, timestamp, nonce, body, 'wrong_secret_key');
    expect(isValid).toBe(false);
  });

  it('should validate timestamps within 5-minute window and reject expired ones', () => {
    const now = Date.now();
    expect(verifyTimestamp(now, 300000, now).valid).toBe(true);
    expect(verifyTimestamp(now - 60000, 300000, now).valid).toBe(true); // 1 min ago

    // 10 minutes ago -> should be rejected
    const expiredTimestamp = now - 10 * 60 * 1000;
    const check = verifyTimestamp(expiredTimestamp, 300000, now);
    expect(check.valid).toBe(false);
  });

  it('should prevent replay attacks by detecting duplicate nonces', () => {
    const keyPrefix = 'KEY_001';
    const testNonce = 'nonce_unique_xyz_999';
    const now = Date.now();

    // First use: valid
    expect(verifyAndStoreNonce(keyPrefix, testNonce, now)).toBe(true);

    // Replay with identical nonce: REJECTED
    expect(verifyAndStoreNonce(keyPrefix, testNonce, now)).toBe(false);
  });
});
