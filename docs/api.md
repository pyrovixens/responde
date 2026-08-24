# RESPONDE — Especificación de API Externa v1

## 1. Introducción

La API REST versionada de RESPONDE permite a sistemas externos (Centros de Despacho 911, CAD municipales, sistemas de telemetría y botones de pánico) ingresar incidentes de emergencia y consultar estados de respuesta de manera segura.

- **Base URL**: `https://tu-dominio.com/api/v1`
- **Formato**: JSON (`Content-Type: application/json`)
- **Autenticación**: Cabeceras `X-API-KEY`, `X-SIGNATURE`, `X-TIMESTAMP`, `X-NONCE` con firma HMAC-SHA256.

---

## 2. Endpoints

### A. Ingesta de Incidente & Despacho Automático
`POST /api/v1/incidents`

#### Request Headers
```http
POST /api/v1/incidents HTTP/1.1
Host: api.responde.app
Content-Type: application/json
X-API-KEY: RESPONDE_DEV_KEY_001
X-SIGNATURE: 4a2f8b9c... (Firma HMAC-SHA256 de 64 caracteres)
X-TIMESTAMP: 1724497200000
X-NONCE: 9f8a3c4e-128b-4a5c-89de-990184abcdef
```

#### Request Body
```json
{
  "external_id": "CAD-911-2026-9901",
  "type": "INCENDIO_ESTRUCTURAL",
  "priority": "P1",
  "sector_code": "SEC-CEN",
  "location_name": "Edificio Residencial Alameda #1450",
  "address": "Av. Libertador Bernardo O'Higgins 1450, Piso 8",
  "latitude": -33.4415,
  "longitude": -70.6512,
  "description": "Fuego violento en departamento habitacional con personas en balcón",
  "caller_name": "Conserjería Edificio",
  "caller_phone": "+56 9 9876 5432",
  "requested_units": ["B-1", "Q-4"],
  "metadata": {
    "floor": 8,
    "building_type": "residential",
    "hazards": ["gas_piping"]
  }
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "idempotent_match": false,
  "incident": {
    "id": "e4c19a82-1200-4b89-a291-889912abcdef",
    "incident_number": "EMG-2026-000186",
    "external_id": "CAD-911-2026-9901",
    "status": "DISPATCHED",
    "priority": "P1",
    "location_name": "Edificio Residencial Alameda #1450",
    "address": "Av. Libertador Bernardo O'Higgins 1450, Piso 8",
    "created_at": "2026-08-24T10:00:00.000Z"
  },
  "dispatch": {
    "dispatch_id": "89ab12cd-34ef-5678-90ab-cdef12345678",
    "units_dispatched": ["B-1", "Q-4"],
    "notifications_count": 6
  }
}
```

---

### B. Confirmación de Recepción de Respondedor (ACK)
`POST /api/v1/ack`

#### Request Body
```json
{
  "notification_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "action": "ACKNOWLEDGED",
  "device_id": "IPHONE-15-PRO-MAX-CB01"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "notification": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "ACKNOWLEDGED",
    "incident_id": "e4c19a82-1200-4b89-a291-889912abcdef",
    "seen_at": "2026-08-24T10:00:02.100Z",
    "acknowledged_at": "2026-08-24T10:00:04.300Z",
    "response_latency_ms": 4300
  }
}
```

---

### C. Evaluación de Timeouts & Escalamiento (Cron)
`POST /api/v1/cron/escalate`

#### Response (200 OK)
```json
{
  "success": true,
  "timestamp": "2026-08-24T10:00:45.000Z",
  "evaluatedCount": 8,
  "timedOutCount": 1,
  "escalatedNotifications": [
    {
      "id": "notif-99",
      "incident_id": "inc-001",
      "incident_number": "EMG-2026-000184",
      "user_name": "Bombero Juan Pérez",
      "timeout_seconds": 45
    }
  ]
}
```

---

## 3. Ejemplo de Firma en Node.js / TypeScript

```typescript
import { createHmac, randomUUID } from 'crypto';

const apiKey = 'RESPONDE_DEV_KEY_001';
const secret = 'responde_dev_secret_key_999888777';
const method = 'POST';
const path = '/api/v1/incidents';
const timestamp = Date.now().toString();
const nonce = randomUUID();

const body = JSON.stringify({
  location_name: 'Parque Industrial #80',
  type: 'INCENDIO_ESTRUCTURAL',
  priority: 'P1',
  description: 'Fuego en galpón de almacenamiento',
  address: 'Calle Industria 80, Sector Sur'
});

const canonicalString = `${method}|${path}|${timestamp}|${nonce}|${body}`;
const signature = createHmac('sha256', secret).update(canonicalString, 'utf8').digest('hex');

const response = await fetch(`https://api.responde.app${path}`, {
  method,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey,
    'X-SIGNATURE': signature,
    'X-TIMESTAMP': timestamp,
    'X-NONCE': nonce,
  },
  body,
});

const result = await response.json();
console.log('Resultado del despacho:', result);
```
