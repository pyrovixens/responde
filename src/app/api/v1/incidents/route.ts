import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyHmacSignature, verifyTimestamp, verifyAndStoreNonce } from '@/lib/security/hmac';
import { sanitizeTextInput } from '@/lib/security/sanitizer';
import { IncidentService } from '@/lib/services/incident-service';
import { DispatchService } from '@/lib/services/dispatch-service';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_PAYLOAD_BYTES = 50 * 1024; // 50 KB max to prevent DoS

const IncidentPayloadSchema = z.object({
  external_id: z.string().max(100).optional(),
  type: z.string().min(2).max(100),
  priority: z.enum(['P1', 'P2', 'P3', 'P4']).default('P1'),
  sector_code: z.string().max(50).optional(),
  sector_id: z.string().uuid().optional(),
  location_name: z.string().min(2).max(255),
  address: z.string().min(3).max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  description: z.string().min(3).max(2000),
  caller_name: z.string().max(150).optional(),
  caller_phone: z.string().max(50).optional(),
  requested_units: z.array(z.string().max(30)).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // 0. Payload size check
    if (rawBody.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: 'PAYLOAD_TOO_LARGE', message: 'Payload exceeds maximum limit of 50KB' },
        { status: 413 }
      );
    }

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

    // 4. Resolve API Key & Secret strictly from DB or secure environment variable
    const defaultSecret = process.env.API_SECRET_SALT || 'responde_production_security_salt_2026';
    let secret = defaultSecret;
    let orgId = 'a0000000-0000-0000-0000-000000000001';
    let clientName = 'Ingestión CAD';

    const supabase = createAdminClient();
    const { data: dbKey } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_prefix', apiKey)
      .eq('is_active', true)
      .maybeSingle();

    if (dbKey) {
      secret = dbKey.secret_hash;
      orgId = dbKey.organization_id;
      clientName = dbKey.name;
    }

    // 5. Verify HMAC-SHA256 signature in constant time
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

    const rawData = parseResult.data;

    // 7. Sanitize inputs against XSS and control character injection
    const sanitizedLocationName = sanitizeTextInput(rawData.location_name, 255);
    const sanitizedAddress = sanitizeTextInput(rawData.address, 500);
    const sanitizedDescription = sanitizeTextInput(rawData.description, 2000);
    const sanitizedCallerName = rawData.caller_name ? sanitizeTextInput(rawData.caller_name, 150) : undefined;
    const sanitizedCallerPhone = rawData.caller_phone ? sanitizeTextInput(rawData.caller_phone, 50) : undefined;

    // 8. Resolve Sector
    let sectorId = rawData.sector_id;
    if (!sectorId && rawData.sector_code) {
      const { data: sec } = await supabase
        .from('sectors')
        .select('id')
        .eq('organization_id', orgId)
        .eq('code', rawData.sector_code)
        .maybeSingle();
      if (sec) sectorId = sec.id;
    }

    // 9. Resolve Protocol / Incident Type
    let protocolId: string | undefined;
    let incidentTypeId: string | undefined;

    const { data: matchingType } = await supabase
      .from('incident_types')
      .select('id, protocol_id, default_priority')
      .eq('organization_id', orgId)
      .or(`code.eq.${rawData.type},name.ilike.%${rawData.type}%`)
      .limit(1)
      .maybeSingle();

    if (matchingType) {
      incidentTypeId = matchingType.id;
      protocolId = matchingType.protocol_id || undefined;
    }

    // 10. Create or retrieve idempotent incident
    const { incident, isExisting } = await IncidentService.createIncident(
      {
        organization_id: orgId,
        external_id: rawData.external_id,
        incident_type_id: incidentTypeId,
        protocol_id: protocolId,
        priority: rawData.priority,
        sector_id: sectorId,
        location_name: sanitizedLocationName,
        address: sanitizedAddress,
        latitude: rawData.latitude,
        longitude: rawData.longitude,
        description: sanitizedDescription,
        caller_name: sanitizedCallerName,
        caller_phone: sanitizedCallerPhone,
        metadata: {
          ...rawData.metadata,
          source_client: clientName,
          api_key_prefix: apiKey,
        },
      },
      { email: `API:${clientName}` }
    );

    // 11. If not existing and requested_units provided, perform immediate dispatch
    let dispatchResult = null;
    if (!isExisting && rawData.requested_units && rawData.requested_units.length > 0) {
      const { data: foundUnits } = await supabase
        .from('units')
        .select('id, code')
        .eq('organization_id', orgId)
        .in('code', rawData.requested_units);

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
