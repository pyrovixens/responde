'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Smartphone,
  Radio,
  History,
  SmartphoneNfc,
  ExternalLink,
  Activity,
  Bell,
  Clock,
} from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('es-CL', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { href: '/', label: 'Centro de Despacho', icon: Radio },
    { href: '/responder', label: 'Móvil Respondedor', icon: Smartphone },
    { href: '/devices', label: 'Dispositivos', icon: SmartphoneNfc },
    { href: '/audit', label: 'Auditoría', icon: History },
  ];

  return (
    <header className="bg-dispatch-900 border-b border-dispatch-700/80 sticky top-0 z-40 px-3 sm:px-6 py-2.5 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Organization Title */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded bg-emergency-600 flex items-center justify-center text-white shadow group-hover:bg-emergency-500 transition-colors">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wider text-slate-100 font-mono text-base">
                  RESPONDE
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emergency-950 text-emergency-500 border border-emergency-800 font-semibold">
                  CAD v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Cuerpo de Bomberos & Rescate Metropolitano
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-dispatch-850 p-1 rounded-lg border border-dispatch-700/60 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-dispatch-700 text-white shadow-sm border border-dispatch-600'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dispatch-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emergency-500' : ''}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Operational Telemetry / Clock */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-dispatch-800 border border-dispatch-700 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-success-500 animate-pulse" />
            <span className="text-[11px] font-semibold">SISTEMA ONLINE</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-dispatch-850 border border-dispatch-700 text-slate-200 font-mono font-bold tracking-wider">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{time || '--:--:--'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
