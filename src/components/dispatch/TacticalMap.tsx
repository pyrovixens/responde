'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Navigation } from 'lucide-react';
import { Incident, Unit, Sector } from '@/types/database';

interface TacticalMapProps {
  incidents: Incident[];
  units: Unit[];
  sectors: Sector[];
  onSelectIncident?: (incident: Incident) => void;
}

// Dynamically import Leaflet client component with SSR disabled
const DynamicTacticalMapClient = dynamic(
  () => import('./TacticalMapClient').then((mod) => mod.TacticalMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-dispatch-950 text-slate-500 font-mono text-xs">
        <Navigation className="w-8 h-8 animate-spin text-emergency-500 mb-2" />
        <span>Cargando Cartografía Táctica OpenStreetMap...</span>
      </div>
    ),
  }
);

export function TacticalMap(props: TacticalMapProps) {
  return (
    <div className="w-full h-full min-h-[320px] rounded-xl overflow-hidden border border-dispatch-700 bg-dispatch-950 shadow-inner relative">
      <DynamicTacticalMapClient {...props} />
    </div>
  );
}
