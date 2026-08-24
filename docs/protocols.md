# RESPONDE — Catálogo y Motor de Protocolos Operacionales

## 1. Concepto y Funcionamiento

Los protocolos en **RESPONDE** no son textos estáticos ni listas rígidas: son directivas operacionales vivas que configuran automáticamente los parámetros del despacho ante un incidente:
- **Prioridad Inicial Sugerida** (`P1` - `P4`)
- **Tiempo Límite de Respuesta (ACK Timeout)** en segundos
- **Matriz de Material Mayor Sugerido** (Bomba, Escala, Rescate, Ambulancia, HazMat)
- **Checklist de Acciones Inmediatas** para el Comandante de Incidente y el personal en ruta
- **Escalamiento Automático** a supervisores si no se cumplen los tiempos de confirmación.

---

## 2. Protocolos Estándar Incorporados

### A. INCENDIO_ESTRUCTURAL (Fuego en Edificación)
- **Prioridad**: `P1 Crítica`
- **Timeout ACK**: `45 segundos`
- **Unidades Sugeridas**: `BOMBA`, `ESCALA`, `RESCATE`
- **Checklist Táctico**:
  1. Confirmar vías de acceso y posición relativa del viento.
  2. Establecer Puesto de Mando (CI) y designar Oficial de Seguridad.
  3. Corte preventivo de energía eléctrica y gas.
  4. Búsqueda primaria y avance con línea de protección presurizada.
  5. Asegurar abastecimiento continuo de agua desde grifos o aljibes.

### B. ACCIDENTE_VEHICULAR (10-4 Rescate Vehicular)
- **Prioridad**: `P1 Crítica`
- **Timeout ACK**: `45 segundos`
- **Unidades Sugeridas**: `RESCATE`, `AMBULANCIA`, `BOMBA`
- **Checklist Táctico**:
  1. Posicionar unidades en ángulo de protección a 45° y señalizar a 100m.
  2. Tender línea preventiva cargada con pitón cerrado.
  3. Estabilización primaria en cuatro puntos y corte de borne de batería.
  4. Extricación y remoción de estructuras con equipo hidráulico.
  5. Inmovilización y entrega coordinada a equipo médico SAMU.

### C. DERRAME_QUIMICO (10-5 Materiales Peligrosos HazMat)
- **Prioridad**: `P1 Crítica`
- **Timeout ACK**: `45 segundos`
- **Unidades Sugeridas**: `HAZMAT`, `BOMBA`, `COMANDO`
- **Checklist Táctico**:
  1. Aproximación con viento a favor a mínimo 150m de distancia.
  2. Identificación de placa ONU / Rombo NFPA 704 y consulta Guía GRE.
  3. Montaje del corredor y carpa de descontaminación antes de ingresar trajes encapsulados.
  4. Contención del producto con diques y material absorbente inerte.

### D. RESCATE_AGRESTE (Búsqueda y Rescate en Desnivel/Montaña)
- **Prioridad**: `P2 Alta`
- **Timeout ACK**: `60 segundos`
- **Unidades Sugeridas**: `RESCATE`, `COMANDO`
- **Checklist Táctico**:
  1. Fijar coordenadas GPS y último punto de contacto conocido (LKP).
  2. Verificar condiciones meteorológicas y horas de luz natural.
  3. Despliegue de patrullas de 3 rescatistas con camilla canasta y kit de hipotermia.

### E. EMERGENCIA_MEDICA (Soporte Vital Avanzado)
- **Prioridad**: `P1 Crítica`
- **Timeout ACK**: `30 segundos`
- **Unidades Sugeridas**: `AMBULANCIA`, `RESCATE`
- **Checklist Táctico**:
  1. Evaluación de escena segura.
  2. Protocolo de reanimación cardiopulmonar (RCP) y desfibrilación externa (DEA).
  3. Manejo avanzado de vía aérea e inmovilización espinal.
  4. Traslado prioritario con preaviso al centro asistencial de referencia.
