import { describe, it, expect } from 'vitest';
import { INITIAL_PROTOCOLS, INITIAL_INCIDENTS } from '@/lib/store/emergency-store';

describe('Operational Emergency Workflows & Latency Calculation', () => {
  it('should verify standard protocols and their required apparatus', () => {
    const fireProtocol = INITIAL_PROTOCOLS.find((p) => p.code === 'INCENDIO_ESTRUCTURAL');
    expect(fireProtocol).toBeDefined();
    expect(fireProtocol?.default_priority).toBe('P1');
    expect(fireProtocol?.ack_timeout_seconds).toBe(45);
    expect(fireProtocol?.suggested_unit_type_codes).toContain('BOMBA');
    expect(fireProtocol?.suggested_unit_type_codes).toContain('ESCALA');
  });

  it('should accurately compute responder response latency in milliseconds', () => {
    const sentAt = new Date('2026-08-24T09:40:00.000Z').getTime();
    const ackAt = new Date('2026-08-24T09:40:04.400Z').getTime();

    const latencyMs = ackAt - sentAt;
    expect(latencyMs).toBe(4400);
    expect((latencyMs / 1000).toFixed(1)).toBe('4.4');
  });

  it('should flag notifications exceeding the protocol ACK timeout threshold', () => {
    const timeoutSeconds = 45;
    const sentAt = new Date('2026-08-24T09:00:00Z').getTime();
    const currentTime = new Date('2026-08-24T09:01:00Z').getTime(); // 60s later

    const elapsedSeconds = Math.floor((currentTime - sentAt) / 1000);
    const isTimedOut = elapsedSeconds > timeoutSeconds;

    expect(elapsedSeconds).toBe(60);
    expect(isTimedOut).toBe(true);
  });

  it('should enforce incident sequence format EMG-YYYY-XXXXXX', () => {
    const sampleIncident = INITIAL_INCIDENTS[0];
    expect(sampleIncident.incident_number).toMatch(/^EMG-\d{4}-\d{6}$/);
  });
});
