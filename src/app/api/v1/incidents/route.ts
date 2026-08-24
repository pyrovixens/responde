import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyHmacSignature, verifyTimestamp, verifyAndStoreNonce } from '@/lib/security/hmac';
import { IncidentService } from '@/lib/services/incident-service';
import { DispatchService } from '@/lib/services/dispatch-service';
import { createAdminClient } from '@/lib/supabase/admin';

// Demo API Key & Secret for testing and integrations
const DEMO_API_KEYS: Record<string, { secret: string; orgId: string; name: string }> = {
  'RESPONDE_DEV_KEY_001': {
    secret: 'responde_dev_secret_key_999888777',
    orgId: 'a0000000-0000-0000-0000-000000000001',
    name: 'CAD Central 911',
  },
};

const IncidentPayloadSchema = z.object({
  external_id: z.string().optional(),
  type: z.string().min(2, 'Incident type is required'),
  priority: z.enum(['P1', 'P2', 'P3', 'P4']).default('P1'),
  sector_code: z.string().optional(),
  sector_id: z.string().uuid().optional(),
  location_name: z.string().min(2, 'Location name is required'),
  address: z.string().min(3, 'Address is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().min(3, 'Description is required'),
  caller_name: z.string().optional(),
  caller_phone: z.string().optional(),
  requested_units: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const apiKey = req.headers.get('x-api-key');
    const signature = req.headers.get('x-signature');
    const timestamp = req.headers.get('x-timestamp');
    const nonce = req.headers.get('x-nonce');

    // 1. Check required security headers
    if (!apiKey || !signature || !timestamp || !nonce) {
      return NextResponse.json(
        {
          error: 'MISSING_SECURITY_HEADERS',
          message: 'Required headers: X-API-KEY, X-SIGNATURE, X-TIMESTAMP, X-NONCE',
        },
        { status: 401 }
      );
    }

    // 2. Validate timestamp freshness (Anti-Replay Window: 5 minutes)
    const timeCheck = verifyTimestamp(timestamp);
    if (!timeCheck.valid) {
      return NextResponse.json(
        { error: 'INVALID_TIMESTAMP', message: timeCheck.reason },
        { status: 401 }
      );
    }

    // 3. Validate and store Nonce
    const nonceValid = verifyAndStoreNonce(apiKey, nonce, parseInt(timestamp, 10));
    if (!nonceValid) {
      return NextResponse.json(
        {
          error: 'REPLAY_ATTACK_DETECTED',
          message: 'Nonce has already been used or is invalid.',
        },
        { status: 403 }
      );
    }

    // 4. Resolve API Key & Secret
    let secret = '';
    let orgId = 'a0000000-0000-0000-0000-000000000001';
    let clientName = 'External CAD';

    if (DEMO_API_KEYS[apiKey]) {
      secret = DEMO_API_KEYS[apiKey].secret;
      orgId = DEMO_API_KEYS[apiKey].orgId;
      clientName = DEMO_API_KEYS[apiKey].name;
    } else {
      // Look up in database
      const supabase = createAdminClient();
      const { data: dbKey } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_prefix', apiKey)
        .eq('is_active', true)
        .maybeSingle();

      if (!dbKey) {
        return NextResponse.json(
          { error: 'INVALID_API_KEY', message: 'API key not recognized or inactive.' },
          { status: 401 }
        );
      }
      secret = dbKey.secret_hash;
      orgId = dbKey.organization_id;
      clientName = dbKey.name;
    }

    // 5. Verify HMAC-SHA256 signature
    const pathname = req.nextUrl.pathname;
    const isSignatureValid = verifyHmacSignature(
      signature,
      req.method,
      pathname,
      timestamp,
      nonce,
      rawBody,
      secret
    );

    if (!isSignatureValid) {
      return NextResponse.json(
        {
          error: 'INVALID_HMAC_SIGNATURE',
          message: 'Cryptographic signature mismatch. Check your secret and canonical signing string.',
        },
        { status: 401 }
      );
    }

    // 6. Parse and validate JSON payload
    let jsonBody: unknown;
    try {
      jsonBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'INVALID_JSON', message: 'Malformed JSON payload' },
        { status: 400 }
      );
    }

    const parseResult = IncidentPayloadSchema.safeParse(jsonBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          details: parseResult.error.flatten(),
        },
        { status: 422 }
      );
    }

    const data = parseResult.data;
    const supabase = createAdminClient();

    // 7. Resolve Sector if sector_code provided
    let sectorId = data.sector_id;
    if (!sectorId && data.sector_code) {
      const { data: sec } = await supabase
        .from('sectors')
        .select('id')
        .eq('organization_id', orgId)
        .eq('code', data.sector_code)
        .maybeSingle();
      if (sec) sectorId = sec.id;
    }

    // 8. Resolve Protocol / Incident Type
    let protocolId: string | undefined;
    let incidentTypeId: string | undefined;

    const { data: matchingType } = await supabase
      .from('incident_types')
      .select('id, protocol_id, default_priority')
      .eq('organization_id', orgId)
      .or(`code.eq.${data.type},name.ilike.%${data.type}%`)
      .limit(1)
      .maybeSingle();

    if (matchingType) {
      incidentTypeId = matchingType.id;
      protocolId = matchingType.protocol_id || undefined;
    }

    // 9. Create or retrieve idempotent incident
    const { incident, isExisting } = await IncidentService.createIncident(
      {
        organization_id: orgId,
        external_id: data.external_id,
        incident_type_id: incidentTypeId,
        protocol_id: protocolId,
        priority: data.priority,
        sector_id: sectorId,
        location_name: data.location_name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description,
        caller_name: data.caller_name,
        caller_phone: data.caller_phone,
        metadata: {
          ...data.metadata,
          source_client: clientName,
          api_key_prefix: apiKey,
        },
      },
      { email: `API:${clientName}` }
    );

    // 10. If not existing and requested_units provided, perform immediate dispatch
    let dispatchResult = null;
    if (!isExisting && data.requested_units && data.requested_units.length > 0) {
      const { data: foundUnits } = await supabase
        .from('units')
        .select('id, code')
        .eq('organization_id', orgId)
        .in('code', data.requested_units);

      if (foundUnits && foundUnits.length > 0) {
        const unitIds = foundUnits.map((u) => u.id);
        dispatchResult = await DispatchService.executeDispatch(
          {
            incident_id: incident.id,
            unit_ids: unitIds,
            notes: `Despacho automático solicitado vía API por ${clientName}`,
          },
          { email: `API:${clientName}` }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        idempotent_match: isExisting,
        incident: {
          id: incident.id,
          incident_number: incident.incident_number,
          external_id: incident.external_id,
          status: incident.status,
          priority: incident.priority,
          location_name: incident.location_name,
          address: incident.address,
          created_at: incident.created_at,
        },
        dispatch: dispatchResult
          ? {
              dispatch_id: dispatchResult.dispatch.id,
              units_dispatched: dispatchResult.assignedUnits.map((u) => u.unit?.code || u.unit_id),
              notifications_count: dispatchResult.notifications.length,
            }
          : null,
      },
      { status: isExisting ? 200 : 201 }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API v1 Incidents] Exception:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: errMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const incidents = await IncidentService.getIncidents();
    return NextResponse.json({
      success: true,
      count: incidents.length,
      incidents: incidents.map((i) => ({
        id: i.id,
        incident_number: i.incident_number,
        external_id: i.external_id,
        status: i.status,
        priority: i.priority,
        location_name: i.location_name,
        address: i.address,
        created_at: i.created_at,
      })),
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: errMessage }, { status: 500 });
  }
}
