# RESPONDE — Guía de Despliegue en Producción

## 1. Requisitos Previos

- **Node.js**: v20+ LTS o v24+
- **Cuenta de Supabase**: Proyecto activo en [supabase.com](https://supabase.com)
- **Cuenta de Vercel**: Para hosting serverless edge en [vercel.com](https://vercel.com)
- **Proyecto de Firebase**: Para Firebase Cloud Messaging (FCM)

---

## 2. Configuración de Base de Datos en Supabase

1. Acceda al **SQL Editor** de su proyecto en el panel de Supabase.
2. Ejecute en orden las migraciones ubicadas en `supabase/migrations/`:
   - `001_initial_schema.sql`: Creación de enums, tablas, índices y secuencias.
   - `002_rls_policies.sql`: Habilitación y definición de políticas de seguridad RLS y funciones RBAC.
   - `003_seed_data.sql`: Carga de protocolos estándar, tipos de unidades, sectores y datos base.
3. En la sección **Database > Replication**, active la replicación en tiempo real (Realtime) para las tablas:
   - `incidents`
   - `dispatches`
   - `notifications`
   - `incident_units`
   - `incident_events`

---

## 3. Configuración de Variables de Entorno

Copie el archivo de plantilla y complete con sus credenciales de producción:

```bash
cp .env.example .env.local
```

### Variables Esenciales
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-publica
SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role-privada
API_SECRET_SALT=cadena-secreta-aleatoria-32-chars
```

---

## 4. Despliegue en Vercel

1. Suba el código a su repositorio en GitHub.
2. Importe el repositorio en el panel de control de Vercel.
3. En la pestaña **Settings > Environment Variables**, agregue todas las variables de `.env.example`.
4. El comando de compilación por defecto es:
   ```bash
   npm run build
   ```
5. Presione **Deploy**. Vercel configurará automáticamente el servidor edge y las cabeceras de seguridad CSP y X-Frame-Options.

---

## 5. Verificación Post-Despliegue

1. Compruebe el estado del sistema mediante el endpoint de salud:
   ```bash
   curl -I https://tu-dominio.vercel.app/api/v1/health
   ```
   Debe responder `HTTP/1.1 200 OK` con payload `status: "OPERATIONAL"`.
2. Realice una prueba de despacho desde la consola web (`/`) y confirme la recepción en el cliente móvil (`/responder`).
