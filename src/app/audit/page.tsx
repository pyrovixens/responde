'use client';

import React, { useState } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { INITIAL_AUDIT_LOGS } from '@/lib/store/emergency-store';
import { AuditLog } from '@/types/database';

export default function AuditLogsPage() {
  const [logs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (selectedActionFilter !== 'ALL' && log.action !== selectedActionFilter) return false;
    if (
      searchQuery &&
      !log.action.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !log.actor_email?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !log.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-success-950 text-success-400 border border-success-800">
          {action}
        </span>
      );
    }
    if (action.includes('DISPATCH')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emergency-950 text-emergency-400 border border-emergency-800">
          {action}
        </span>
      );
    }
    if (action.includes('REVOKE')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emergency-900 text-emergency-200 border border-emergency-700">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-dispatch-800 text-slate-300 border border-dispatch-700">
        {action}
      </span>
    );
  };

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full flex flex-col gap-4">
      {/* Header */}
      <div className="bg-dispatch-900 border border-dispatch-700 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-dispatch-800 border border-dispatch-700 flex items-center justify-center text-emergency-500">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 font-mono tracking-wider">
              REGISTRO DE AUDITORÍA & TRAZABILIDAD (APPEND-ONLY)
            </h1>
            <p className="text-xs text-slate-400">
              Inmutabilidad criptográfica en base de datos. Ningún registro puede ser modificado ni eliminado.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar acción, usuario, IP..."
              className="bg-dispatch-800 border border-dispatch-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emergency-500"
            />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-1.5 flex-wrap bg-dispatch-900 p-2.5 rounded-lg border border-dispatch-800 text-xs">
        <span className="text-slate-400 text-[11px] font-semibold mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filtrar Acción:
        </span>
        {['ALL', 'CREATE_INCIDENT', 'DISPATCH_UNIT', 'DISPATCH_ACKNOWLEDGED', 'REVOKE_DEVICE'].map(
          (act) => (
            <button
              key={act}
              onClick={() => setSelectedActionFilter(act)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                selectedActionFilter === act
                  ? 'bg-dispatch-700 text-white border border-dispatch-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dispatch-800'
              }`}
            >
              {act}
            </button>
          )
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-dispatch-900 border border-dispatch-700 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dispatch-850 text-slate-300 font-mono text-[11px] uppercase border-b border-dispatch-700">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Operador / Actor</th>
                <th className="p-3.5">Acción</th>
                <th className="p-3.5">Entidad</th>
                <th className="p-3.5">IP & Origen</th>
                <th className="p-3.5">Detalles / Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dispatch-800 bg-dispatch-900/60 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-dispatch-850/50 transition-colors">
                  <td className="p-3.5 text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('es-CL')}
                  </td>
                  <td className="p-3.5 font-bold text-slate-200 whitespace-nowrap">
                    {log.actor_email || 'Sistema / API'}
                  </td>
                  <td className="p-3.5">{getActionBadge(log.action)}</td>
                  <td className="p-3.5 text-slate-300 whitespace-nowrap">
                    {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}
                  </td>
                  <td className="p-3.5 text-slate-400 whitespace-nowrap">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                  <td className="p-3.5 text-slate-300 max-w-xs truncate">
                    {log.new_values ? JSON.stringify(log.new_values) : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
