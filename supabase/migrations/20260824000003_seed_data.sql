-- ============================================================================
-- RESPONDE — Sistema Integrado de Despacho de Emergencias
-- Migration: 003_seed_data.sql
-- Description: Standard Protocols, Sectors, Units, Unit Types and Demo Setup
-- ============================================================================

-- 1. DEMO ORGANIZATION
INSERT INTO organizations (id, name, slug, code, address, phone, settings)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Cuerpo de Bomberos & Rescate Metropolitano',
    'cuerpo-bomberos-central',
    'CBC-01',
    'Av. Libertador Bernardo O''Higgins 1450, Santiago, Chile',
    '+56 2 2698 1234',
    '{
        "default_ack_timeout_seconds": 45,
        "auto_escalate_supervisor": true,
        "allow_external_ingestion": true,
        "enable_sound_alerts": true
    }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 2. SECTORS
INSERT INTO sectors (id, organization_id, name, code, description)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Sector 1 - Norte Residencial', 'SEC-NOR', 'Zona habitacional de alta densidad y centros de salud'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Sector 2 - Centro Cívico / Comercial', 'SEC-CEN', 'Zona gubernamental, bancaria y torres de altura'),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Sector 3 - Sur Industrial', 'SEC-SUR', 'Parques logísticos, químicos y manufactura'),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Sector 4 - Oriente / Cordillera', 'SEC-ORI', 'Interfaz urbano-forestal, senderos y zonas precordilleranas')
ON CONFLICT (id) DO NOTHING;

-- 3. UNIT TYPES
INSERT INTO unit_types (id, organization_id, name, code, category, icon)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Bomba de Ataque / Extinción', 'BOMBA', 'FIRE', 'flame'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Rescate Vehicular y Pesado', 'RESCATE', 'RESCUE', 'shield-alert'),
    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Escala Mecánica Telescópica', 'ESCALA', 'FIRE', 'chevrons-up'),
    ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Ambulancia / Soporte Vital', 'AMBULANCIA', 'MEDICAL', 'activity'),
    ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Materiales Peligrosos HazMat', 'HAZMAT', 'HAZMAT', 'alert-triangle'),
    ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Puesto de Mando y Control', 'COMANDO', 'COMMAND', 'radio')
ON CONFLICT (id) DO NOTHING;

-- 4. UNITS
INSERT INTO units (id, organization_id, unit_type_id, code, name, callsign, status, current_sector_id, latitude, longitude, capacity)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'B-1', 'Bomba Urbana Primera', 'BOMBA-1', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000002', -33.4429, -70.6539, 6),
    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'B-2', 'Bomba Forestal / Interfaz', 'BOMBA-2', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000004', -33.4250, -70.6120, 6),
    ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'R-1', 'Unidad Rescate Técnico', 'RESCATE-1', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000001', -33.4180, -70.6650, 5),
    ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'RX-3', 'Rescate Pesado Vehicular', 'RESCATE-PESADO', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000003', -33.4890, -70.6720, 4),
    ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Q-4', 'Escala Telescópica 30m', 'ESCALA-4', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000002', -33.4410, -70.6480, 4),
    ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'M-1', 'Ambulancia Avanzada SAMU', 'MED-1', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000001', -33.4210, -70.6510, 3),
    ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'H-1', 'Unidad HazMat Materiales Peligrosos', 'HAZMAT-1', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000003', -33.4950, -70.6800, 4),
    ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'K-1', 'Puesto de Mando Móvil', 'COMANDO-1', 'IN_SERVICE', 'b0000000-0000-0000-0000-000000000002', -33.4380, -70.6500, 4)
ON CONFLICT (id) DO NOTHING;

-- 5. PROTOCOLS
INSERT INTO protocols (id, organization_id, code, name, description, default_priority, ack_timeout_seconds, suggested_unit_type_codes, auto_escalate_supervisor)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'INCENDIO_ESTRUCTURAL', 'Incendio Estructural / Fuego en Edificación', 'Alarma por fuego declarado en vivienda, edificio o local comercial', 'P1', 45, ARRAY['BOMBA', 'ESCALA', 'RESCATE'], true),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'ACCIDENTE_VEHICULAR', 'Accidente Vehicular con Atrapados (10-4)', 'Colisión de alta energía, volcamiento o personas atrapadas en móviles', 'P1', 45, ARRAY['RESCATE', 'AMBULANCIA', 'BOMBA'], true),
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'RESCATE_AGRESTE', 'Rescate en Montaña / Agreste / Desnivel', 'Búsqueda y extracción de personas en cerros, quebradas o pozos', 'P2', 60, ARRAY['RESCATE', 'COMANDO'], true),
    ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'DERRAME_QUIMICO', 'Materiales Peligrosos / HazMat (10-5)', 'Fuga de gas tóxico, derrame de hidrocarburos o químicos peligrosos', 'P1', 45, ARRAY['HAZMAT', 'BOMBA', 'COMANDO'], true),
    ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'EMERGENCIA_MEDICA', 'Emergencia Médica de Soporte Vital', 'Paro cardiorrespiratorio, politraumatismo o inconsciencia', 'P1', 30, ARRAY['AMBULANCIA', 'RESCATE'], true),
    ('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'EVACUACION_PREVENTIVA', 'Evacuación de Emergencia / Colapso', 'Riesgo inminente de derrumbe estructural o inundación', 'P2', 60, ARRAY['RESCATE', 'BOMBA', 'COMANDO'], true)
ON CONFLICT (id) DO NOTHING;

-- 6. PROTOCOL STEPS
INSERT INTO protocol_steps (protocol_id, step_order, title, description, is_mandatory)
VALUES
    -- Incendio Estructural
    ('e0000000-0000-0000-0000-000000000001', 1, 'Confirmar Vías de Acceso', 'Verificar accesos libres para material mayor y posición del viento', true),
    ('e0000000-0000-0000-0000-000000000001', 2, 'Establecer Puesto de Mando (CI)', 'Designar Comandante de Incidente y Oficial de Seguridad', true),
    ('e0000000-0000-0000-0000-000000000001', 3, 'Corte de Suministros Críticos', 'Corte preventivo y verificado de electricidad y gas licuado/natural', true),
    ('e0000000-0000-0000-0000-000000000001', 4, 'Búsqueda Primaria y Ventilación', 'Avance simultáneo de rescate con línea de protección cargada', true),
    ('e0000000-0000-0000-0000-000000000001', 5, 'Abastecimiento de Agua', 'Conexión inmediata a red de grifos o cisterna nodriza', true),

    -- Accidente Vehicular
    ('e0000000-0000-0000-0000-000000000002', 1, 'Asegurar Zona y Tráfico', 'Posicionar unidades en ángulo de protección de 45° y conos a 100m', true),
    ('e0000000-0000-0000-0000-000000000002', 2, 'Línea de Agua / Extintor', 'Línea presurizada con pitón cerrado lista ante derrame de combustible', true),
    ('e0000000-0000-0000-0000-000000000002', 3, 'Estabilización de Vehículos', 'Acuñamiento en cuatro puntos y corte de borne negativo de batería', true),
    ('e0000000-0000-0000-0000-000000000002', 4, 'Acceso y Extricación', 'Remoción de puertas/techo mediante cizalla y expansor hidráulico', true),
    ('e0000000-0000-0000-0000-000000000002', 5, 'Inmovilización Espinal', 'Collar cervical, tabla espinal y entrega a equipo paramédico', true),

    -- Rescate Agreste
    ('e0000000-0000-0000-0000-000000000003', 1, 'Fijar Coordenadas GPS / LKP', 'Establecer Último Punto de Contacto Conocido y canal radial repetidor', true),
    ('e0000000-0000-0000-0000-000000000003', 2, 'Evaluación Meteorológica', 'Verificar viento, nubosidad y horas de luz natural restante', false),
    ('e0000000-0000-0000-0000-000000000003', 3, 'Despliegue de Patrullas', 'Equipos de 3 rescatistas con camilla canasta y kit de hipotermia', true),

    -- HazMat
    ('e0000000-0000-0000-0000-000000000004', 1, 'Aproximación con Viento a Favor', 'Apostarse a contraviento a mínimo 150 metros del punto de fuga', true),
    ('e0000000-0000-0000-0000-000000000004', 2, 'Identificación ONU / Guía GRE', 'Reconocer placa rombo NFPA 704 o número de cuatro dígitos ONU', true),
    ('e0000000-0000-0000-0000-000000000004', 3, 'Corredor de Descontaminación', 'Montar duchas de descontaminación antes del ingreso de trajes encapsulados', true),
    ('e0000000-0000-0000-0000-000000000004', 4, 'Control y Dique de Contención', 'Contener derrame con material absorbente e inertizante', true);

-- 7. INCIDENT TYPES
INSERT INTO incident_types (id, organization_id, protocol_id, code, name, default_priority, icon, color)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'INC_ESTRUCTURAL', 'Incendio Estructural', 'P1', 'flame', '#DC2626'),
    ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'ACC_TRANSITO', 'Accidente de Tránsito con Atrapados', 'P1', 'car-crash', '#EA580C'),
    ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'RESC_AGRESTE', 'Rescate en Quebrada / Montaña', 'P2', 'mountain', '#D97706'),
    ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'HAZMAT_FUGA', 'Emergencia Química / Fuga de Gas', 'P1', 'alert-triangle', '#7C3AED'),
    ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'MED_PCR', 'Paro Cardiorrespiratorio / Soporte Vital', 'P1', 'heart-pulse', '#E11D48')
ON CONFLICT (id) DO NOTHING;
