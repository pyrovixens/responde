'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Flame,
  Truck,
  MapPin,
  FileText,
  Phone,
  User,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';
import { Protocol, Sector, Unit, IncidentPriority } from '@/types/database';
import { CreateIncidentInput } from '@/types/emergency';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  protocols: Protocol[];
  sectors: Sector[];
  units: Unit[];
  onSubmit: (input: CreateIncidentInput, selectedUnitIds: string[]) => Promise<void>;
}

export function CreateIncidentModal({
  isOpen,
  onClose,
  protocols,
  sectors,
  units,
  onSubmit,
}: CreateIncidentModalProps) {
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>(protocols[0]?.id || '');
  const [priority, setPriority] = useState<IncidentPriority>('P1');
  const [sectorId, setSectorId] = useState<string>(sectors[0]?.id || '');
  const [locationName, setLocationName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [callerName, setCallerName] = useState<string>('');
  const [callerPhone, setCallerPhone] = useState<string>('');
  const [externalId, setExternalId] = useState<string>('');
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // When protocol changes, update default priority and suggested units
  const handleProtocolChange = (protoId: string) => {
    setSelectedProtocolId(protoId);
    const proto = protocols.find((p) => p.id === protoId);
    if (proto) {
      setPriority(proto.default_priority);
      // Auto-suggest available units matching protocol unit types
      if (proto.suggested_unit_type_codes && proto.suggested_unit_type_codes.length > 0) {
        const matchingUnitIds = units
          .filter((u) => u.status === 'IN_SERVICE')
          .slice(0, 3)
          .map((u) => u.id);
        setSelectedUnitIds(matchingUnitIds);
      }
    }
  };

  const toggleUnitSelection = (unitId: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName.trim() || !address.trim() || !description.trim()) {
      setErrorMsg('Por favor complete los campos obligatorios (Lugar, Dirección y Descripción).');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const payload: CreateIncidentInput = {
        protocol_id: selectedProtocolId || undefined,
        priority,
        sector_id: sectorId || undefined,
        location_name: locationName.trim(),
        address: address.trim(),
        description: description.trim(),
        caller_name: callerName.trim() || undefined,
        caller_phone: callerPhone.trim() || undefined,
        external_id: externalId.trim() || undefined,
        requested_units: units.filter((u) => selectedUnitIds.includes(u.id)).map((u) => u.code),
      };

      await onSubmit(payload, selectedUnitIds);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al despachar el incidente';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentProtocol = protocols.find((p) => p.id === selectedProtocolId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-dispatch-900 border border-dispatch-700 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-dispatch-850 px-5 py-3.5 border-b border-dispatch-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-emergency-600 flex items-center justify-center text-white font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide">
                NUEVA ALARMA / DESPACHO DE EMERGENCIA
              </h2>
              <p className="text-xs text-slate-400">
                Ingreso de incidente y activación de unidades operativas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-dispatch-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-emergency-950/80 border border-emergency-800 text-emergency-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-emergency-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Protocol & Priority Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Protocol */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-emergency-500" />
                Protocolo Operacional *
              </label>
              <select
                value={selectedProtocolId}
                onChange={(e) => handleProtocolChange(e.target.value)}
                className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emergency-500 font-medium"
              >
                {protocols.map((proto) => (
                  <option key={proto.id} value={proto.id}>
                    {proto.name} ({proto.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Prioridad *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as IncidentPriority)}
                className={`w-full border rounded-lg px-3 py-2 text-sm font-bold focus:outline-none ${
                  priority === 'P1'
                    ? 'bg-emergency-950 text-emergency-400 border-emergency-700'
                    : priority === 'P2'
                    ? 'bg-warning-900/60 text-warning-400 border-warning-700'
                    : 'bg-dispatch-800 text-slate-200 border-dispatch-600'
                }`}
              >
                <option value="P1">P1 — Crítica / Vital</option>
                <option value="P2">P2 — Alta / Urgente</option>
                <option value="P3">P3 — Media / Ordinaria</option>
                <option value="P4">P4 — Baja / Apoyo</option>
              </select>
            </div>
          </div>

          {/* Protocol Operational Steps Preview */}
          {currentProtocol?.steps && currentProtocol.steps.length > 0 && (
            <div className="bg-dispatch-850 p-3 rounded-lg border border-dispatch-700/80">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Pasos Inmediatos del Protocolo ({currentProtocol.steps.length}):
              </span>
              <ul className="text-xs text-slate-400 space-y-1">
                {currentProtocol.steps.map((st) => (
                  <li key={st.id} className="flex items-start gap-1.5">
                    <span className="font-mono text-emergency-500 font-bold">{st.step_order}.</span>
                    <span>
                      <strong className="text-slate-200">{st.title}:</strong> {st.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sector & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Sector / Cuadrante *
              </label>
              <select
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
                className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emergency-500"
              >
                {sectors.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} ({sec.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Lugar / Referencia *
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Ej. Edificio Las Torres #450, Piso 7"
                className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emergency-500"
                required
              />
            </div>
          </div>

          {/* Exact Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Dirección Exacta / Intersección *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej. Av. Libertador Bernardo O'Higgins con San Martín"
              className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emergency-500 font-mono text-xs"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Descripción Operativa y Peligros *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Detalles de la emergencia, víctimas, peligros inmediatos, color de humo, atrapados..."
              className="w-full bg-dispatch-800 border border-dispatch-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emergency-500"
              required
            />
          </div>

          {/* Caller Details & External ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-500" />
                Informante
              </label>
              <input
                type="text"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                placeholder="Conserjería / Vecino"
                className="w-full bg-dispatch-800 border border-dispatch-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500" />
                Teléfono
              </label>
              <input
                type="tel"
                value={callerPhone}
                onChange={(e) => setCallerPhone(e.target.value)}
                placeholder="+56 9 1234 5678"
                className="w-full bg-dispatch-800 border border-dispatch-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                ID Externo (CAD / 911)
              </label>
              <input
                type="text"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="Ej. CAD-2026-99"
                className="w-full bg-dispatch-800 border border-dispatch-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          {/* Apparatus Selection */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emergency-500" />
                Unidades para Despacho ({selectedUnitIds.length} seleccionadas)
              </span>
              <span className="text-[11px] text-slate-400">
                Disponibles: {units.filter((u) => u.status === 'IN_SERVICE').length}
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {units.map((unit) => {
                const isSelected = selectedUnitIds.includes(unit.id);
                const isAvailable = unit.status === 'IN_SERVICE';

                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => toggleUnitSelection(unit.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emergency-950/80 border-emergency-500 text-white shadow-sm ring-1 ring-emergency-500'
                        : isAvailable
                        ? 'bg-dispatch-800/80 border-dispatch-700 text-slate-300 hover:border-dispatch-500'
                        : 'bg-dispatch-900/50 border-dispatch-800 text-slate-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono font-bold text-sm tracking-wider text-slate-100">
                        {unit.code}
                      </span>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emergency-500" />
                      ) : (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isAvailable ? 'bg-success-500' : 'bg-warning-500'
                          }`}
                        />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 truncate mt-1">
                      {unit.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="bg-dispatch-850 px-5 py-3 border-t border-dispatch-700 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-dispatch-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg bg-emergency-600 hover:bg-emergency-500 text-white font-bold text-xs tracking-wider flex items-center gap-2 shadow-lg hover:shadow-emergency-700/50 transition-all disabled:opacity-50 uppercase"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>
              {isSubmitting ? 'Emitiendo Despacho...' : 'Confirmar y Despachar Ahora'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
