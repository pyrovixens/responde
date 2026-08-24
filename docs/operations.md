# RESPONDE — Manual de Procedimientos Operacionales (SOP)

## 1. Roles Operacionales y Cadena de Mando

- **Despachador (DISPATCHER)**: Responsable de la recepción de llamadas, clasificación inicial de la emergencia, selección del protocolo adecuado y emisión de la alarma hacia las unidades y personal de guardia.
- **Supervisor de Turno (SUPERVISOR)**: Supervisa las colas de incidentes, evalúa las alertas de timeout en tiempo real y autoriza el despacho de refuerzos o unidades de apoyo inter-institucionales.
- **Líder de Unidad (UNIT_LEADER)**: Oficial o maquinista a cargo del móvil (ej. B-1, R-1). Responsable de confirmar el despacho (`ACK`), reportar cuando la unidad sale en ruta (`EN_ROUTE`) y cuando arriba a la escena (`ON_SCENE`).
- **Respondedor / Bombero (RESPONDER)**: Voluntario o rescatista que recibe la notificación en su dispositivo móvil y confirma de inmediato su disponibilidad para abordar la unidad.

---

## 2. Procedimiento Estándar de Despacho (SOP-01)

1. **Recepción y Clasificación**:
   - El despachador ingresa la dirección exacta y selecciona el protocolo operacional correspondiente.
   - El sistema sugiere automáticamente las unidades más adecuadas y establece la prioridad (`P1` - `P4`).
2. **Emisión de Alarma**:
   - Al presionar **Confirmar y Despachar Ahora**, el sistema:
     - Asigna el identificador correlativo único (`EMG-YYYY-XXXXXX`).
     - Activa las unidades seleccionadas.
     - Dispara las notificaciones push y alertas sonoras a los teléfonos vinculados.
3. **Control de Confirmación (ACK)**:
   - El despachador monitorea el indicador de ACK en la consola.
   - Si transcurre el tiempo límite (ej. 45s) sin respuesta de un respondedor clave, el motor de escalamiento genera una alerta visible y sonora en la consola de mando para proceder a la reasignación inmediata.
4. **Seguimiento y Control en Escena**:
   - A medida que las unidades arriban a la escena, el estado del incidente se actualiza a `ON_SCENE`.
   - El Comandante de Incidente marca en la lista de verificación (checklist) las acciones tácticas completadas (corte de suministros, puesto de mando, búsqueda primaria).
5. **Cierre y Liberación**:
   - Una vez finalizada la labor, el despachador marca el incidente como `CONTROLLED` y posteriormente `CLOSED`, liberando las unidades para que vuelvan al estado `IN_SERVICE` (Disponible en cuartel).
