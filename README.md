# RESPONDE — Sistema Integrado de Despacho de Emergencias

**RESPONDE** es una plataforma profesional de mando, despacho de emergencias y coordinación de respuesta inmediata diseñada para cuerpos de bomberos, brigadas de rescate y centros de despacho 911/CAD.

---

## 🚨 Características Principales

- **Identificación e Idempotencia**: Generación atómica en PostgreSQL de identificadores `EMG-YYYY-XXXXXX` con soporte para claves externas (`(organization_id, external_id)`) para evitar duplicaciones.
- **Seguridad RBAC & RLS**: 7 roles operacionales (`SUPER_ADMIN`, `ADMIN`, `DISPATCHER`, `SUPERVISOR`, `UNIT_LEADER`, `RESPONDER`, `VIEWER`) con Row Level Security estricto en todas las tablas.
- **API Externa Segura**: Ingesta protegida con firmas **HMAC-SHA256**, tokens **Nonce** contra ataques de repetición y verificación de ventanas de tiempo ($\pm 5$ min).
- **Máquina de Estados ACK y Telemetría**: Trazabilidad completa con estados `SENT` ➔ `DELIVERED` ➔ `SEEN` ➔ `ACKNOWLEDGED` / `DECLINED` / `TIMEOUT` y cálculo de latencia de respuesta al milisegundo.
- **Motor de Escalamiento Automático**: Detección y notificación en tiempo real cuando un respondedor no confirma en el tiempo configurado por protocolo.
- **Cartografía Táctica OpenStreetMap**: Mapa interactivo con visualización de cuadrantes, sectores, pines de incidentes críticos y posicionamiento de material mayor.
- **Interfaz Móvil para Respondedor**: PWA de alto contraste diseñada para uso en terreno, con generador sintetizado de alarma sonora (Web Audio API) y botones táctiles gigantes de confirmación rápida.
- **Gestión y Revocación Remota de Dispositivos**: Capacidad para que un administrador bloquee instantáneamente hardware extraviado o desvinculado.
- **Auditoría Inmutable (Append-Only)**: Trigger PostgreSQL que prohíbe operaciones `UPDATE` y `DELETE` sobre registros de auditoría.

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Leaflet (OpenStreetMap).
- **Backend & Base de Datos**: Supabase, PostgreSQL 15+, Row Level Security (RLS), Supabase Realtime.
- **Seguridad Criptográfica**: Web Crypto & Node Crypto (HMAC-SHA256, Nonces, Timing-Safe Equal).
- **Audio & Haptic Feedback**: Web Audio API Oscillators, Vibration API.
- **Testing**: Vitest (13 pruebas unitarias e integrales).

---

## 🚀 Inicio Rápido

### 1. Clonar e Instalar Dependencias
```bash
npm install
```

### 2. Configurar Variables de Entorno
```bash
cp .env.example .env.local
```

### 3. Ejecutar Pruebas Automatizadas
```bash
npm test
```

### 4. Iniciar Servidor de Desarrollo
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) para ingresar a la **Consola de Despacho** o [http://localhost:3000/responder](http://localhost:3000/responder) para la **Interfaz Móvil del Respondedor**.

---

## 📚 Documentación Técnica

- [Arquitectura del Sistema](file:///Users/macbook/Desktop/DEspachame/docs/architecture.md)
- [Guía de Seguridad y RBAC](file:///Users/macbook/Desktop/DEspachame/docs/security.md)
- [Especificación de API REST & HMAC](file:///Users/macbook/Desktop/DEspachame/docs/api.md)
- [Catálogo de Protocolos y Procedimientos](file:///Users/macbook/Desktop/DEspachame/docs/protocols.md)
- [Guía de Despliegue en Supabase y Vercel](file:///Users/macbook/Desktop/DEspachame/docs/deployment.md)
- [Manual de Operaciones y SOP](file:///Users/macbook/Desktop/DEspachame/docs/operations.md)

---

## 📄 Licencia

Uso operacional bajo autorización de la institución de emergencias respectiva.
