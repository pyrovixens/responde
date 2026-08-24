'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Building2,
  Truck,
  MapPin,
  Flame,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Shield,
  Send,
  Bot,
  ExternalLink,
} from 'lucide-react';
import {
  INITIAL_UNITS,
  INITIAL_SECTORS,
  INITIAL_PROTOCOLS,
} from '@/lib/store/emergency-store';
import { Unit, Sector, Protocol, UnitStatus, IncidentPriority } from '@/types/database';

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<'ORG' | 'UNITS' | 'SECTORS' | 'PROTOCOLS' | 'TELEGRAM' | 'RESET'>('ORG');

  // Organization state
  const [orgName, setOrgName] = useState<string>('Cuerpo de Bomberos & Rescate Metropolitano');
  const [orgCode, setOrgCode] = useState<string>('CBC-01');
  const [orgAddress, setOrgAddress] = useState<string>('Av. Central 1450, Cuartel General');
  const [orgPhone, setOrgPhone] = useState<string>('+56 2 2698 1234');
  const [defaultAckTimeout, setDefaultAckTimeout] = useState<number>(45);

  // Telegram Bot state
  const [telegramBotToken, setTelegramBotToken] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [telegramTestStatus, setTelegramTestStatus] = useState<string | null>(null);
  const [isTestingTelegram, setIsTestingTelegram] = useState<boolean>(false);

  // Units state
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [newUnitCode, setNewUnitCode] = useState<string>('');
  const [newUnitName, setNewUnitName] = useState<string>('');
  const [newUnitCategory, setNewUnitCategory] = useState<string>('FIRE');
  const [newUnitCapacity, setNewUnitCapacity] = useState<number>(6);

  // Sectors state
  const [sectors, setSectors] = useState<Sector[]>(INITIAL_SECTORS);
  const [newSectorCode, setNewSectorCode] = useState<string>('');
  const [newSectorName, setNewSectorName] = useState<string>('');
  const [newSectorDesc, setNewSectorDesc] = useState<string>('');

  // Protocols state
  const [protocols, setProtocols] = useState<Protocol[]>(INITIAL_PROTOCOLS);
  const [newProtoCode, setNewProtoCode] = useState<string>('');
  const [newProtoName, setNewProtoName] = useState<string>('');
  const [newProtoPriority, setNewProtoPriority] = useState<IncidentPriority>('P1');
  const [newProtoTimeout, setNewProtoTimeout] = useState<number>(45);
  const [newProtoDesc, setNewProtoDesc] = useState<string>('');

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Load from LocalStorage if available
  useEffect(() => {
    try {
      const savedOrg = localStorage.getItem('responde_custom_org');
      if (savedOrg) {
        const parsed = JSON.parse(savedOrg);
        setOrgName(parsed.name || orgName);
        setOrgCode(parsed.code || orgCode);
        setOrgAddress(parsed.address || orgAddress);
        setOrgPhone(parsed.phone || orgPhone);
        setDefaultAckTimeout(parsed.timeout || 45);
      }

      const savedTg = localStorage.getItem('responde_custom_telegram');
      if (savedTg) {
        const parsedTg = JSON.parse(savedTg);
        setTelegramBotToken(parsedTg.token || '');
        setTelegramChatId(parsedTg.chatId || '');
      }

      const savedUnits = localStorage.getItem('responde_custom_units');
      if (savedUnits) setUnits(JSON.parse(savedUnits));

      const savedSectors = localStorage.getItem('responde_custom_sectors');
      if (savedSectors) setSectors(JSON.parse(savedSectors));

      const savedProtocols = localStorage.getItem('responde_custom_protocols');
      if (savedProtocols) setProtocols(JSON.parse(savedProtocols));
    } catch {
      // Fallback to initial
    }
  }, []);

  const handleTestTelegram = async () => {
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      setTelegramTestStatus('Por favor ingresa el Bot Token y el Chat ID primero.');
      return;
    }

    setIsTestingTelegram(true);
    setTelegramTestStatus(null);

    try {
      const res = await fetch('/api/v1/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramBotToken.trim(),
          chatId: telegramChatId.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTelegramTestStatus('✅ ¡Mensaje de prueba enviado exitosamente a tu chat de Telegram!');
      } else {
        setTelegramTestStatus(`❌ Error: ${data.message || 'No se pudo conectar con Telegram'}`);
      }
    } catch (err: unknown) {
      setTelegramTestStatus('❌ Error de red al probar conexión con Telegram.');
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleSaveAll = () => {
    try {
      localStorage.setItem(
        'responde_custom_org',
        JSON.stringify({
          name: orgName,
          code: orgCode,
          address: orgAddress,
          phone: orgPhone,
          timeout: defaultAckTimeout,
        })
      );
      localStorage.setItem(
        'responde_custom_telegram',
        JSON.stringify({
          token: telegramBotToken,
          chatId: telegramChatId,
        })
      );
      localStorage.setItem('responde_custom_units', JSON.stringify(units));
      localStorage.setItem('responde_custom_sectors', JSON.stringify(sectors));
      localStorage.setItem('responde_custom_protocols', JSON.stringify(protocols));

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      // Ignored
    }
  };

  // Add Unit
  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitCode.trim() || !newUnitName.trim()) return;

    const newU: Unit = {
      id: `custom-unit-${Date.now()}`,
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      unit_type_id: 'c0000000-0000-0000-0000-000000000001',
      code: newUnitCode.trim().toUpperCase(),
      name: newUnitName.trim(),
      callsign: `${newUnitCode.trim().toUpperCase()}-MOVIL`,
      status: 'IN_SERVICE',
      current_sector_id: sectors[0]?.id || null,
      latitude: -33.4429,
      longitude: -70.6539,
      last_location_update: new Date().toISOString(),
      capacity: newUnitCapacity,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUnits((prev) => [...prev, newU]);
    setNewUnitCode('');
    setNewUnitName('');
    setNewUnitCapacity(6);
  };

  const handleDeleteUnit = (id: string) => {
    setUnits((prev) => prev.filter((u) => u.id !== id));
  };

  // Add Sector
  const handleAddSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectorCode.trim() || !newSectorName.trim()) return;

    const newS: Sector = {
      id: `custom-sec-${Date.now()}`,
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      name: newSectorName.trim(),
      code: newSectorCode.trim().toUpperCase(),
      description: newSectorDesc.trim() || null,
      polygon_geojson: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSectors((prev) => [...prev, newS]);
    setNewSectorCode('');
    setNewSectorName('');
    setNewSectorDesc('');
  };

  const handleDeleteSector = (id: string) => {
    setSectors((prev) => prev.filter((s) => s.id !== id));
  };

  // Add Protocol
  const handleAddProtocol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProtoCode.trim() || !newProtoName.trim()) return;

    const newP: Protocol = {
      id: `custom-proto-${Date.now()}`,
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      code: newProtoCode.trim().toUpperCase().replace(/\s+/g, '_'),
      name: newProtoName.trim(),
      description: newProtoDesc.trim() || null,
      default_priority: newProtoPriority,
      ack_timeout_seconds: newProtoTimeout,
      suggested_unit_type_codes: ['BOMBA', 'RESCATE'],
      auto_escalate_supervisor: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      steps: [
        {
          id: `step-${Date.now()}-1`,
          protocol_id: `custom-proto-${Date.now()}`,
          step_order: 1,
          title: 'Verificar Escena y Accesos',
          description: 'Aproximación segura y corte preventivo de energía',
          is_mandatory: true,
          created_at: new Date().toISOString(),
        },
      ],
    };

    setProtocols((prev) => [...prev, newP]);
    setNewProtoCode('');
    setNewProtoName('');
    setNewProtoDesc('');
  };

  const handleDeleteProtocol = (id: string) => {
    setProtocols((prev) => prev.filter((p) => p.id !== id));
  };

  // Clean Slate (Reset to Zero)
  const handleClearToZero = () => {
    if (confirm('¿Desea vaciar todos los datos de prueba y comenzar con una configuración 100% limpia?')) {
      setOrgName('Mi Institución de Emergencias');
      setOrgCode('EMG-01');
      setOrgAddress('Dirección de Cuartel Central');
      setOrgPhone('+56 9 0000 0000');
      setUnits([]);
      setSectors([]);
      setProtocols([]);
      localStorage.clear();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  // Restore defaults
  const handleRestoreDefaults = () => {
    if (confirm('¿Desea restaurar la plantilla predeterminada con el Cuerpo de Bomberos y Flota B-1, R-1, etc.?')) {
      setOrgName('Cuerpo de Bomberos & Rescate Metropolitano');
      setOrgCode('CBC-01');
      setOrgAddress("Av. Libertador Bernardo O'Higgins 1450, Santiago, Chile");
      setOrgPhone('+56 2 2698 1234');
      setDefaultAckTimeout(45);
      setUnits(INITIAL_UNITS);
      setSectors(INITIAL_SECTORS);
      setProtocols(INITIAL_PROTOCOLS);
      localStorage.clear();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full flex flex-col gap-4">
      {/* Top Banner */}
      <div className="bg-dispatch-900 border border-dispatch-700 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-dispatch-800 border border-dispatch-700 flex items-center justify-center text-emergency-500">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 font-mono tracking-wider">
              CONFIGURACIÓN DE INSTITUCIÓN, FLOTA & PROTOCOLOS
            </h1>
            <p className="text-xs text-slate-400">
              Personaliza tus propios datos operativos, cuadrantes, vehículos de rescate y tiempos de respuesta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <div className="px-3 py-1 rounded bg-success-950 text-success-400 border border-success-700 text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CAMBIOS GUARDADOS</span>
            </div>
          )}
          <button
            onClick={handleSaveAll}
            className="px-4 py-2 rounded-lg bg-success-600 hover:bg-success-500 text-white font-bold text-xs font-mono tracking-wider flex items-center gap-1.5 shadow transition-all uppercase"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-dispatch-700 bg-dispatch-850 p-1 rounded-lg gap-1 overflow-x-auto text-xs font-mono font-bold">
        <button
          onClick={() => setActiveTab('ORG')}
          className={`py-2 px-3 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'ORG'
              ? 'bg-dispatch-700 text-white shadow border border-dispatch-600'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-emergency-500" />
          <span>1. Mi Institución</span>
        </button>

        <button
          onClick={() => setActiveTab('UNITS')}
          className={`py-2 px-3 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'UNITS'
              ? 'bg-dispatch-700 text-white shadow border border-dispatch-600'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5 text-emergency-500" />
          <span>2. Flota & Unidades ({units.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SECTORS')}
          className={`py-2 px-3 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'SECTORS'
              ? 'bg-dispatch-700 text-white shadow border border-dispatch-600'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-emergency-500" />
          <span>3. Sectores ({sectors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PROTOCOLS')}
          className={`py-2 px-3 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'PROTOCOLS'
              ? 'bg-dispatch-700 text-white shadow border border-dispatch-600'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-emergency-500" />
          <span>4. Protocolos ({protocols.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TELEGRAM')}
          className={`py-2 px-3 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'TELEGRAM'
              ? 'bg-dispatch-700 text-white shadow border border-dispatch-600'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send className="w-3.5 h-3.5 text-emergency-500" />
          <span>5. Bot de Telegram</span>
        </button>

        <button
          onClick={() => setActiveTab('RESET')}
          className={`py-2 px-3 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'RESET'
              ? 'bg-emergency-950 text-emergency-400 border border-emergency-800'
              : 'text-slate-400 hover:text-emergency-400'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>6. Pizarra en Blanco / Reset</span>
        </button>
      </div>

      {/* TAB 1: Organization Settings */}
      {activeTab === 'ORG' && (
        <div className="bg-dispatch-900 border border-dispatch-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emergency-500" />
            Datos Institucionales
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre de la Institución / Brigada *
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Ej. Cuerpo de Bomberos de Valparaíso"
                className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emergency-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Código / Sigla Institucional *
              </label>
              <input
                type="text"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value)}
                placeholder="Ej. CBV-01 o BRIG-MIN"
                className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emergency-500 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Dirección Cuartel General
              </label>
              <input
                type="text"
                value={orgAddress}
                onChange={(e) => setOrgAddress(e.target.value)}
                placeholder="Ej. Calle Principal 1234"
                className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emergency-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Teléfono de Emergencias / Central
              </label>
              <input
                type="text"
                value={orgPhone}
                onChange={(e) => setOrgPhone(e.target.value)}
                placeholder="Ej. +56 32 212 3456"
                className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emergency-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tiempo Límite de Confirmación (ACK Timeout por defecto)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={defaultAckTimeout}
                  onChange={(e) => setDefaultAckTimeout(parseInt(e.target.value, 10) || 45)}
                  min={10}
                  max={300}
                  className="w-32 bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emergency-500 font-mono font-bold"
                />
                <span className="text-xs text-slate-400">segundos (Al expirar, se escala la alarma)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Units Fleet */}
      {activeTab === 'UNITS' && (
        <div className="space-y-4">
          {/* Add Unit Form */}
          <form onSubmit={handleAddUnit} className="bg-dispatch-900 border border-dispatch-700 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-emergency-500" />
              Agregar Nueva Unidad a la Flota
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                  Código (ej. B-1, R-2, Q-5) *
                </label>
                <input
                  type="text"
                  value={newUnitCode}
                  onChange={(e) => setNewUnitCode(e.target.value)}
                  placeholder="B-1"
                  className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono font-bold uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                  Nombre Operacional *
                </label>
                <input
                  type="text"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="Bomba Primera Compañía"
                  className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                  Capacidad Tripulantes
                </label>
                <input
                  type="number"
                  value={newUnitCapacity}
                  onChange={(e) => setNewUnitCapacity(parseInt(e.target.value, 10) || 6)}
                  min={1}
                  max={20}
                  className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-lg bg-emergency-600 hover:bg-emergency-500 text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar Móvil</span>
                </button>
              </div>
            </div>
          </form>

          {/* Units Roster */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {units.map((u) => (
              <div key={u.id} className="bg-dispatch-850 border border-dispatch-700 p-3.5 rounded-xl flex items-center justify-between shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-dispatch-800 border border-dispatch-700 flex items-center justify-center font-mono font-bold text-sm text-slate-100">
                    {u.code}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-100">{u.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Cap: {u.capacity} respondedores • {u.status}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteUnit(u.id)}
                  className="p-1.5 text-slate-500 hover:text-emergency-400 rounded-lg hover:bg-dispatch-800 transition-colors"
                  title="Eliminar Unidad"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Sectors */}
      {activeTab === 'SECTORS' && (
        <div className="space-y-4">
          <form onSubmit={handleAddSector} className="bg-dispatch-900 border border-dispatch-700 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-emergency-500" />
              Agregar Cuadrante / Sector Geográfico
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                  Código (ej. SEC-NOR, CUAD-1) *
                </label>
                <input
                  type="text"
                  value={newSectorCode}
                  onChange={(e) => setNewSectorCode(e.target.value)}
                  placeholder="SEC-NOR"
                  className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono font-bold uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                  Nombre del Sector *
                </label>
                <input
                  type="text"
                  value={newSectorName}
                  onChange={(e) => setNewSectorName(e.target.value)}
                  placeholder="Sector 1 - Norte Habitacional"
                  className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-semibold"
                  required
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-lg bg-emergency-600 hover:bg-emergency-500 text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Sector</span>
                </button>
              </div>
            </div>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sectors.map((s) => (
              <div key={s.id} className="bg-dispatch-850 border border-dispatch-700 p-3.5 rounded-xl flex items-center justify-between shadow">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-dispatch-800 text-emergency-400 border border-dispatch-700">
                      {s.code}
                    </span>
                    <span className="font-bold text-xs text-slate-100">{s.name}</span>
                  </div>
                  {s.description && (
                    <p className="text-[11px] text-slate-400 mt-1">{s.description}</p>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteSector(s.id)}
                  className="p-1.5 text-slate-500 hover:text-emergency-400 rounded-lg hover:bg-dispatch-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Protocols */}
      {activeTab === 'PROTOCOLS' && (
        <div className="space-y-4">
          <form onSubmit={handleAddProtocol} className="bg-dispatch-900 border border-dispatch-700 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-emergency-500" />
              Crear Nuevo Protocolo de Emergencia
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                  Código (ej. RESCATE_VEHICULAR) *
                </label>
                <input
                  type="text"
                  value={newProtoCode}
                  onChange={(e) => setNewProtoCode(e.target.value)}
                  placeholder="INCENDIO_FORESTAL"
                  className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                  Nombre Descriptivo *
                </label>
                <input
                  type="text"
                  value={newProtoName}
                  onChange={(e) => setNewProtoName(e.target.value)}
                  placeholder="Fuego Forestal / Interfaz Urbano"
                  className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                  Prioridad & Timeout
                </label>
                <div className="flex gap-2">
                  <select
                    value={newProtoPriority}
                    onChange={(e) => setNewProtoPriority(e.target.value as IncidentPriority)}
                    className="bg-dispatch-800 border border-dispatch-600 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-mono font-bold"
                  >
                    <option value="P1">P1 Vital</option>
                    <option value="P2">P2 Alta</option>
                    <option value="P3">P3 Media</option>
                  </select>
                  <input
                    type="number"
                    value={newProtoTimeout}
                    onChange={(e) => setNewProtoTimeout(parseInt(e.target.value, 10) || 45)}
                    className="w-16 bg-dispatch-800 border border-dispatch-600 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-mono text-center font-bold"
                    placeholder="45s"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-lg bg-emergency-600 hover:bg-emergency-500 text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Protocolo</span>
                </button>
              </div>
            </div>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {protocols.map((p) => (
              <div key={p.id} className="bg-dispatch-850 border border-dispatch-700 p-3.5 rounded-xl shadow space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emergency-950 text-emergency-400 border border-emergency-800">
                    {p.code} ({p.default_priority}) • {p.ack_timeout_seconds}s
                  </span>

                  <button
                    onClick={() => handleDeleteProtocol(p.id)}
                    className="p-1 text-slate-500 hover:text-emergency-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="font-bold text-xs text-slate-100">{p.name}</div>
                {p.description && <p className="text-[11px] text-slate-400">{p.description}</p>}

                {p.steps && p.steps.length > 0 && (
                  <div className="pt-2 border-t border-dispatch-800 text-[10px] text-slate-400">
                    Checklist: {p.steps.length} pasos operacionales configurados
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Telegram Bot Integration */}
      {activeTab === 'TELEGRAM' && (
        <div className="bg-dispatch-900 border border-dispatch-700 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2">
              <Send className="w-4 h-4 text-emergency-500" />
              Integración de Bot de Telegram para Despachos & Alertas
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-dispatch-800 text-slate-300 border border-dispatch-600">
              ALERTAS CON BOTONES ACK EN VIVO
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Conecta un Bot de Telegram para que cada vez que se emita una emergencia en el Centro de Despacho, se envíe automáticamente una notificación instantánea a tu Grupo de Bomberos o Canal de Rescate con botones interactivos de <b>[🟢 VOY AL CUARTEL]</b> y <b>[📍 VER MAPA]</b>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Telegram Bot Token *
              </label>
              <input
                type="text"
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                placeholder="Ej. 7123456789:AAFlKj99xY2qW..."
                className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emergency-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Obtenlo en 30 segundos abriendo <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-emergency-400 underline inline-flex items-center gap-0.5">@BotFather <ExternalLink className="w-3 h-3 inline" /></a> en Telegram y enviando <code>/newbot</code>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Chat ID o ID de Grupo / Canal *
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Ej. -1001928374650 o tu ID personal"
                className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emergency-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Agrega tu bot como Administrador a tu Grupo o Canal de bomberos, o envía <code>/start</code> al bot para obtener tu Chat ID.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-dispatch-800 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleTestTelegram}
              disabled={isTestingTelegram}
              className="px-4 py-2.5 rounded-xl bg-dispatch-800 hover:bg-dispatch-700 text-slate-200 border border-dispatch-600 font-bold font-mono text-xs uppercase tracking-wider flex items-center gap-2 shadow transition-all disabled:opacity-50"
            >
              <Bot className="w-4 h-4 text-emergency-500" />
              <span>{isTestingTelegram ? 'Enviando prueba...' : '🧪 Probar Conexión con Telegram'}</span>
            </button>

            {telegramTestStatus && (
              <div className="text-xs font-mono font-bold text-slate-200">
                {telegramTestStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: Reset / Clean Slate */}
      {activeTab === 'RESET' && (
        <div className="bg-dispatch-900 border border-dispatch-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-emergency-400 font-bold font-mono text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>GESTIÓN DE DATOS & PIZARRA EN BLANCO</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Puedes vaciar todos los registros de demostración para ingresar la información real de tu institución desde cero, o bien restaurar los datos predeterminados en cualquier momento.
          </p>

          <div className="flex flex-wrap gap-3 pt-3">
            <button
              onClick={handleClearToZero}
              className="px-4 py-2.5 rounded-xl bg-emergency-950 hover:bg-emergency-900 text-emergency-300 border border-emergency-700 font-bold font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Limpiar Todo y Empezar Desde Cero</span>
            </button>

            <button
              onClick={handleRestoreDefaults}
              className="px-4 py-2.5 rounded-xl bg-dispatch-800 hover:bg-dispatch-700 text-slate-200 border border-dispatch-600 font-bold font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restablecer Plantilla de Demostración</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
