'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Compass } from 'lucide-react';

interface MapPickerProps {
  lat?: number;
  lng?: number;
  onChange: (coords: { lat: number; lng: number }) => void;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: lat || -17.3935, // Cochabamba / Bolivia por defecto
    lng: lng || -66.1570,
  });

  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Carga dinámica de Leaflet solo en el cliente
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Solución para iconos rotos por defecto de Leaflet en empaquetadores modernos
      const customIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      if (!mapInstanceRef.current) {
        // Inicializar mapa
        const map = L.map(mapContainerRef.current).setView([currentCoords.lat, currentCoords.lng], 15);
        mapInstanceRef.current = map;

        // Capa de OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Marcador arrastrable (Draggable)
        const marker = L.marker([currentCoords.lat, currentCoords.lng], {
          draggable: true,
          icon: customIcon,
        }).addTo(map);

        markerRef.current = marker;

        // Evento al arrastrar el marcador con el mouse o con el dedo
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const newCoords = { lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) };
          setCurrentCoords(newCoords);
          onChange(newCoords);
        });

        // Evento al hacer clic en cualquier parte del mapa
        map.on('click', (e: any) => {
          const newCoords = { lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) };
          marker.setLatLng([newCoords.lat, newCoords.lng]);
          setCurrentCoords(newCoords);
          onChange(newCoords);
        });
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Función para obtener ubicación GPS del dispositivo
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const newCoords = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        setCurrentCoords(newCoords);
        onChange(newCoords);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([newCoords.lat, newCoords.lng], 17);
          markerRef.current.setLatLng([newCoords.lat, newCoords.lng]);
        }
      },
      (error) => {
        setLocating(false);
        console.warn('Error GPS:', error);
        alert('No se pudo obtener el GPS actual. Asegúrate de activar el permiso de ubicación.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-emerald-600" />
          Ubicación en el Mapa (Arrastra el pin o haz clic)
        </label>
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all rounded-lg shadow-sm disabled:opacity-50"
        >
          <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
          {locating ? 'Localizando GPS...' : '📍 Mi GPS Actual'}
        </button>
      </div>

      {/* Contenedor del mapa */}
      <div className="relative w-full h-64 sm:h-72 border border-slate-300 rounded-xl overflow-hidden shadow-inner bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Indicador de coordenadas en tiempo real */}
      <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
        <div className="flex items-center gap-1 font-mono">
          <Compass className="w-3.5 h-3.5 text-slate-400" />
          <span>Lat: <strong className="text-slate-800">{currentCoords.lat}</strong></span>
          <span className="text-slate-300">|</span>
          <span>Lng: <strong className="text-slate-800">{currentCoords.lng}</strong></span>
        </div>
        <span className="text-emerald-700 font-medium">Pin interactivo activo</span>
      </div>
    </div>
  );
}
