'use client';

import React, { useEffect, useRef } from 'react';
import { Incident, Unit, Sector } from '@/types/database';

interface TacticalMapClientProps {
  incidents: Incident[];
  units: Unit[];
  sectors: Sector[];
  onSelectIncident?: (incident: Incident) => void;
}

export function TacticalMapClient({
  incidents,
  units,
  sectors,
  onSelectIncident,
}: TacticalMapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent multiple inits

    let isMounted = true;

    // Load Leaflet dynamically in browser
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix default Leaflet icon paths
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Default coordinates: Santiago / Central Command (-33.4429, -70.6539)
      const map = L.map(mapContainerRef.current, {
        center: [-33.4429, -70.6539],
        zoom: 13,
        zoomControl: true,
      });

      // High-contrast tactical / carto dark tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      // Render Active Incidents Markers
      incidents.forEach((inc) => {
        if (inc.latitude && inc.longitude) {
          const isP1 = inc.priority === 'P1';
          const markerColor = isP1 ? '#DC2626' : '#D97706';

          const customIcon = L.divIcon({
            className: 'custom-emergency-pin',
            html: `
              <div style="
                background-color: ${markerColor};
                color: white;
                font-family: monospace;
                font-weight: bold;
                font-size: 11px;
                padding: 3px 6px;
                border-radius: 4px;
                box-shadow: 0 0 12px ${isP1 ? 'rgba(220, 38, 38, 0.8)' : 'rgba(217, 119, 6, 0.6)'};
                border: 1px solid white;
                display: flex;
                align-items: center;
                gap: 4px;
                white-space: nowrap;
              ">
                🚨 ${inc.incident_number}
              </div>
            `,
            iconSize: [110, 24],
            iconAnchor: [55, 12],
          });

          const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon }).addTo(map);
          marker.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #111;">
              <strong>${inc.incident_number} (${inc.priority})</strong><br/>
              <strong>${inc.protocol?.name || 'Emergencia'}</strong><br/>
              ${inc.location_name}<br/>
              <em>${inc.address}</em>
            </div>
          `);

          if (onSelectIncident) {
            marker.on('click', () => onSelectIncident(inc));
          }
        }
      });

      // Render Available Units Markers
      units.forEach((unit) => {
        if (unit.latitude && unit.longitude) {
          const isAvailable = unit.status === 'IN_SERVICE';
          const unitIcon = L.divIcon({
            className: 'custom-unit-pin',
            html: `
              <div style="
                background-color: ${isAvailable ? '#059669' : '#DC2626'};
                color: white;
                font-family: monospace;
                font-weight: bold;
                font-size: 10px;
                padding: 2px 5px;
                border-radius: 3px;
                border: 1px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.5);
              ">
                🚒 ${unit.code}
              </div>
            `,
            iconSize: [48, 20],
            iconAnchor: [24, 10],
          });

          L.marker([unit.latitude, unit.longitude], { icon: unitIcon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family: sans-serif; font-size: 12px; color: #111;">
                <strong>${unit.code} — ${unit.name}</strong><br/>
                Estado: ${unit.status}<br/>
                Capacidad: ${unit.capacity} respondedores
              </div>
            `);
        }
      });

      mapInstanceRef.current = map;
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [incidents, units, sectors, onSelectIncident]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[320px]" />;
}
