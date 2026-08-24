# RESPONDE — Protocolos de Seguridad, Anti-Copia y Protección Contra Hackers

Este documento detalla las medidas de hardening y defensa en profundidad implementadas en **RESPONDE** para mitigar riesgos de filtración de claves, ingeniería inversa de código y ataques cibernéticos maliciosos.

---

## 1. Protección & Ocultamiento de API Keys

### Principio de Cero Exposición
- **Frontend Seguro**: El código cliente (React / PWA) **únicamente** recibe la clave pública anónima de lectura (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **Claves Privadas Aisladas**: La clave administrativa `SUPABASE_SERVICE_ROLE_KEY` y los secretos de integración **nunca** forman parte de los bundles de JavaScript del navegador.
- **Server Actions & Route Handlers**: Todas las operaciones privilegiadas (creación de despacho, revocación de dispositivos, escritura en bitácora inmutable) se ejecutan estrictamente en el entorno aislado del servidor (Edge Functions / Node.js Runtime).
- **Control de Repositorio**: El archivo `.gitignore` prohíbe de forma estricta subir archivos `.env`, `.env.local` o credenciales en texto plano a GitHub.

---

## 2. Protocolos Anti-Copia & Protección de Código Fuente

1. **Deshabilitación de Source Maps en Producción (`productionBrowserSourceMaps: false`)**:
   - Next.js compila el código en bundles fuertemente minificados y ofuscados sin incluir los mapas `.map`. Un atacante que intente inspeccionar el código en las herramientas de desarrollador solo verá bytecode comprimido sin nombres de variables originales ni estructura interna.
2. **Supresión de Huellas Digitales (`poweredByHeader: false`)**:
   - Se elimina la cabecera `X-Powered-By: Next.js` para evitar que escáneres automáticos reconozcan la tecnología base.
3. **Control de Acceso a Recursos (CORP / COOP)**:
   - Se previene que sitios externos embeban la plataforma en iframes mediante `X-Frame-Options: DENY` (anti-Clickjacking).

---

## 3. Blindaje Contra Ataques de Hackers

### A. Detección y Bloqueo de Escáneres de Vulnerabilidades
El middleware de borde ([middleware.ts](file:///Users/macbook/Desktop/DEspachame/src/middleware.ts)) inspecciona el `User-Agent` de cada petición entrante y bloquea de forma inmediata (`HTTP 403 Forbidden`) herramientas automáticas de ataque como:
- `sqlmap` (ataques de inyección SQL)
- `nikto` / `acunetix` / `nessus` (escaneo de vulnerabilidades)
- `dirbuster` / `gobuster` (fuerza bruta de rutas)
- `nmap` / `masscan` (sondeo de puertos)

### B. Limitador de Tasa (Rate Limiting) & Anti-DDoS
- Se implementó un algoritmo de ventana deslizante ([rate-limiter.ts](file:///Users/macbook/Desktop/DEspachame/src/lib/security/rate-limiter.ts)) que limita las peticiones por IP a 120 req/min en endpoints de API.
- Si una IP supera el umbral, se bloquea temporalmente devolviendo `HTTP 429 Too Many Requests` con la cabecera estándar `Retry-After`.

### C. Firmas Criptográficas HMAC-SHA256 & Protección Anti-Replay
- Cada petición de la API externa (`/api/v1/incidents`) debe firmarse con HMAC-SHA256.
- **Validación en Tiempo Constante**: La verificación de firmas utiliza `crypto.timingSafeEqual` para prevenir ataques de canal lateral por análisis de tiempo (timing attacks).
- **Ventana Temporal Estricta**: Peticiones con más de $\pm 5$ minutos de desfase son rechazadas.
- **Un solo uso por Nonce**: Cada UUID `X-NONCE` es registrado para anular cualquier intento de repetición de paquetes capturados en tránsito.

### D. Sanitización Anti-XSS e Inyecciones
- El módulo [sanitizer.ts](file:///Users/macbook/Desktop/DEspachame/src/lib/security/sanitizer.ts) depura caracteres nulos (`\0`), etiquetas `<script>` e inyecciones de código antes de que cualquier texto sea procesado por la base de datos o renderizado en pantalla.
- Límite estricto de tamaño de payload (máximo 50 KB) para evitar ataques de agotamiento de memoria.

### E. Cabeceras HTTP de Seguridad (Security Headers)
Configuradas en [next.config.ts](file:///Users/macbook/Desktop/DEspachame/next.config.ts):
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (Fuerza HTTPS permanente)
- `Content-Security-Policy`: Restringe la carga de scripts, fuentes y estilos a dominios legítimos autorizados.
- `X-Content-Type-Options: nosniff`: Previene ataques de confusión de tipos MIME.
- `Permissions-Policy`: Bloquea acceso no autorizado a hardware como cámara, micrófono, USB y pagos.
