'use client';

import React from 'react';
import { Truck, Activity, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Unit, UnitStatus } from '@/types/database';

interface UnitFleetStatusProps {
  units: Unit[];
  onUpdateUnitStatus?: (unitId: string, newStatus: UnitStatus) => void;
}

export function UnitFleetStatus({ units, onUpdateUnitStatus }: UnitFleetStatusProps) {
  const getStatusBadge = (status: UnitStatus) => {
    switch (status) {
      case 'IN_SERVICE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-success-950 text-success-400 border border-success-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
            DISPONIBLE
          </span>
        );
      case 'DISPATCHED':
      case 'EN_ROUTE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emergency-950 text-emergency-400 border border-emergency-800 flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emergency-500" />
            DESPACHADA / RUTA
          </span>
        );
      case 'ON_SCENE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            EN ESCENA
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-dispatch-800 text-slate-400 border border-dispatch-700">
            {status}
          </span>
        );
    }
  };

  const availableCount = units.filter((u) => u.status === 'IN_SERVICE').length;

  return (
    <div className="bg-dispatch-900 border border-dispatch-700 rounded-xl shadow-lg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3.5 bg-dispatch-850 border-b border-dispatch-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-emergency-500" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
            Estado de Flota & Material Mayor
          </h2>
        </div>
        <div className="text-xs font-mono">
          <span className="text-success-400 font-bold">{availableCount}</span>
          <span className="text-slate-500">/{units.length} Disponibles</span>
        </div>
      </div>

      {/* Units Grid */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 overflow-y-auto">
        {units.map((unit) => (
          <div
            key={unit.id}
            className="bg-dispatch-850 p-2.5 rounded-lg border border-dispatch-700/80 hover:border-dispatch-600 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono font-bold text-sm text-slate-100 tracking-wider">
                {unit.code}
              </span>
              {getStatusBadge(unit.status)}
            </div>

            <div className="text-xs text-slate-300 font-medium truncate mb-1">
              {unit.name}
            </div>

            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-dispatch-800">
              <span>Cap: {unit.capacity} bomberos</span>
              {unit.status !== 'IN_SERVICE' && onUpdateUnitStatus && (
                <button
                  onClick={() => onUpdateUnitStatus(unit.id, 'IN_SERVICE')}
                  className="text-success-400 hover:text-success-300 font-semibold underline"
                >
                  Liberar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
