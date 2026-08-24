import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'OPERATIONAL',
    system: 'RESPONDE — Integrated Emergency Dispatch',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    engine: {
      dispatch: 'ONLINE',
      realtime: 'CONNECTED',
      ack_machine: 'READY',
      escalation_worker: 'ACTIVE',
      security_gateway: 'HMAC_SHA256_STRICT',
    },
  });
}
