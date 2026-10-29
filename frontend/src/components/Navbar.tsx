'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, UserCheck, Shield, LogOut } from 'lucide-react';
import { getPendingCount, synchronizeData } from '../lib/sync';
import { UserRole, Usuario } from '../types';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  preventistaId: string;
  currentUser?: Usuario | null;
  onLogout?: () => void;
}

export default function Navbar({ currentRole, onRoleChange, preventistaId, currentUser, onLogout }: NavbarProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const updateStatus = async () => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const count = await getPendingCount();
      setPendingCount(count);
    }
  };

  useEffect(() => {
    updateStatus();

    const handleOnline = () => {
      setIsOnline(true);
      updateStatus();
      // Intento de autosync al volver online
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(updateStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [preventistaId]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg(null);
    const result = await synchronizeData(preventistaId);
    setSyncMsg(result.message);
    setSyncing(false);
    updateStatus();

    setTimeout(() => setSyncMsg(null), 4000);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        {/* Logo y título */}
        <div className="flex items-center gap-2.5">
          <span className="text-2xl select-none">🍿</span>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">Snacks Preventa</h1>
            <p className="text-[11px] text-slate-500 font-medium">Gestión en Calle & Gerencia</p>
          </div>
        </div>

        {/* Indicadores y controles */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Badge de conexión */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">En Línea</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Offline ({pendingCount})</span>
              </>
            )}
          </div>

          {/* Botón de sincronización manual */}
          {pendingCount > 0 && isOnline && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-sm transition-all"
              title="Sincronizar cambios pendientes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{syncing ? 'Sincronizando...' : `Subir (${pendingCount})`}</span>
            </button>
          )}

          {/* Selector de Rol */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => onRoleChange('preventista')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                currentRole === 'preventista'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Preventista</span>
            </button>
            <button
              onClick={() => onRoleChange('gerente')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                currentRole === 'gerente'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Gerente</span>
            </button>
          </div>

          {/* Usuario y Salir */}
          {currentUser && (
            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
              <span className="text-xs font-semibold text-slate-700 hidden lg:inline max-w-[120px] truncate" title={currentUser.nombre_completo}>
                {currentUser.nombre_completo}
              </span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Alerta de notificación temporal de sync */}
      {syncMsg && (
        <div className="bg-blue-50 border-t border-b border-blue-200 text-blue-800 text-xs px-4 py-1.5 text-center font-medium animate-fadeIn">
          {syncMsg}
        </div>
      )}
    </header>
  );
}
