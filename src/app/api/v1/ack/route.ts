import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AckService } from '@/lib/services/ack-service';

const AckSchema = z.object({
  notification_id: z.string().uuid(),
  action: z.enum(['SEEN', 'ACKNOWLEDGED', 'DECLINED']),
  decline_reason: z.string().optional(),
  device_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = AckSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parseResult.error.flatten() },
        { status: 422 }
      );
    }

    const { notification_id, action, decline_reason, device_id } = parseResult.data;

    const updatedNotification = await AckService.processAck({
      notification_id,
      action,
      decline_reason,
      device_id,
    });

    return NextResponse.json({
      success: true,
      notification: {
        id: updatedNotification.id,
        status: updatedNotification.status,
        incident_id: updatedNotification.incident_id,
        seen_at: updatedNotification.seen_at,
        acknowledged_at: updatedNotification.acknowledged_at,
        declined_at: updatedNotification.declined_at,
        response_latency_ms: updatedNotification.response_latency_ms,
      },
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API v1 ACK] Exception:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: errMessage },
      { status: 500 }
    );
  }
}
