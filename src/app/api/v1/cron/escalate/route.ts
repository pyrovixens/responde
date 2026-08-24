import { NextResponse } from 'next/server';
import { EscalationService } from '@/lib/services/escalation-service';

export async function POST() {
  try {
    const result = await EscalationService.evaluateTimeouts();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: errMessage }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
