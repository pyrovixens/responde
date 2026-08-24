# RESPONDE — Guía de Seguridad y Cumplimiento

## 1. Modelo de Seguridad y Defensa en Profundidad

RESPONDE implementa un modelo de seguridad por capas diseñado para entornos de misión crítica donde la integridad de la información y la disponibilidad del servicio son de máxima prioridad.

---

## 2. Row Level Security (RLS) en PostgreSQL

Todas las tablas de la base de datos cuentan con políticas RLS activas (`ENABLE ROW LEVEL SECURITY`). Las políticas se rigen bajo los siguientes principios:

| Rol | Alcance de Lectura | Alcance de Escritura |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | Global (todas las organizaciones) | Global |
| `ADMIN` | Toda su organización | Toda su organización (usuarios, unidades, protocolos) |
| `DISPATCHER` | Incidentes y unidades de su organización | Crear incidentes, despachar, actualizar estados |
| `SUPERVISOR` | Toda su organización | Supervisión, escalamiento y reasignación |
| `UNIT_LEADER` | Incidentes asignados a su unidad | Actualizar estado de unidad, emitir ACK |
| `RESPONDER` | Incidentes donde fue notificado | Emitir ACK/Decline sobre su notificación |
| `VIEWER` | Vista resumida de incidentes | Sin permisos de escritura |

---

## 3. Autenticación de API Externa con HMAC-SHA256

Las peticiones hacia `POST /api/v1/incidents` deben firmarse criptográficamente utilizando una clave compartida (API Secret).

### Headers Requeridos
- `X-API-KEY`: Identificador del cliente.
- `X-SIGNATURE`: Firma HMAC-SHA256 en formato hexadecimal.
- `X-TIMESTAMP`: Tiempo Unix en milisegundos.
- `X-NONCE`: Cadena única aleatoria (mínimo 8 caracteres).

### Algoritmo de Firma
```
canonical_string = METHOD + "|" + PATH + "|" + TIMESTAMP + "|" + NONCE + "|" + BODY
signature = HMAC_SHA256(canonical_string, API_SECRET)
```

### Mitigación de Ataques de Repetición (Anti-Replay)
1. **Ventana de Tolerancia Temporal**: Se rechazan solicitudes cuyo `X-TIMESTAMP` difiera en más de $\pm 5$ minutos del reloj del servidor.
2. **Registro de Nonces**: Cada `X-NONCE` recibido se almacena temporalmente. Si se recibe un nonce idéntico para la misma clave, la petición es rechazada con código `403 Forbidden`.
3. **Comparación en Tiempo Constante**: La verificación de firmas utiliza `crypto.timingSafeEqual` para prevenir ataques de canal lateral por análisis de tiempo (timing attacks).

---

## 4. Gestión y Revocación Remota de Dispositivos

En caso de robo, extravío o desvinculación de un respondedor:
1. El Administrador accede a la consola de **Dispositivos**.
2. Selecciona **Revocar Acceso** e ingresa el motivo del bloqueo.
3. El estado del dispositivo pasa inmediatamente a `is_active = false` y `revoked_at = now()`.
4. El dispositivo es desconectado de los canales Realtime y se bloquea el envío de tokens Push futuros.

---

## 5. Auditoría Inmutable (Append-Only)

La tabla `audit_logs` cuenta con un trigger PostgreSQL a nivel de motor (`prevent_audit_log_tampering`) que genera una excepción si cualquier usuario o servicio intenta ejecutar `UPDATE` o `DELETE`. Toda acción administrativa u operacional genera un registro indeleble.
