'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Usuario, UserRole } from '../types';
import { LogIn, UserPlus, Mail, Lock, User, Phone, Shield, UserCheck, AlertCircle, Loader2 } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (usuario: Usuario) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState<UserRole>('preventista');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (!supabase) {
        throw new Error('El cliente de Supabase no está configurado.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('No se pudo obtener información del usuario.');
      }

      // Consultar el perfil en public.usuarios
      let userProfile: Usuario = {
        id: data.user.id,
        email: data.user.email || email.trim(),
        nombre_completo: data.user.user_metadata?.nombre_completo || email.split('@')[0],
        rol: (data.user.user_metadata?.rol as UserRole) || 'preventista',
        activo: true,
      };

      try {
        const { data: dbUser } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (dbUser) {
          userProfile = {
            id: dbUser.id,
            email: data.user.email || email.trim(),
            nombre_completo: dbUser.nombre_completo || userProfile.nombre_completo,
            telefono: dbUser.telefono,
            rol: dbUser.rol as UserRole,
            activo: dbUser.activo ?? true,
          };
        }
      } catch (profileErr) {
        console.warn('No se pudo cargar el perfil detallado, usando metadatos:', profileErr);
      }

      // Guardar en localStorage para disponibilidad sin conexión
      localStorage.setItem('app_user_session', JSON.stringify(userProfile));
      onLoginSuccess(userProfile);
    } catch (err: any) {
      console.error('Error al iniciar sesión:', err);
      setErrorMsg(err?.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!nombreCompleto.trim()) {
      setErrorMsg('Por favor introduce tu nombre completo.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      if (!supabase) {
        throw new Error('El cliente de Supabase no está configurado.');
      }

      // 1. Registro en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            nombre_completo: nombreCompleto.trim(),
            rol: rol,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('No se pudo completar el registro del usuario.');
      }

      // 2. Crear registro en la tabla public.usuarios
      const newProfile: Usuario = {
        id: data.user.id,
        email: data.user.email || email.trim(),
        nombre_completo: nombreCompleto.trim(),
        telefono: telefono.trim() || undefined,
        rol: rol,
        activo: true,
      };

      try {
        await supabase.from('usuarios').upsert({
          id: newProfile.id,
          nombre_completo: newProfile.nombre_completo,
          telefono: newProfile.telefono,
          rol: newProfile.rol,
          activo: true,
        });
      } catch (tableErr) {
        console.warn('Aviso: Perfil creado en Auth pero falló inserción en tabla:', tableErr);
      }

      // Guardar sesión y entrar directamente
      localStorage.setItem('app_user_session', JSON.stringify(newProfile));
      setSuccessMsg('¡Usuario registrado con éxito! Entrando al sistema...');
      setTimeout(() => {
        onLoginSuccess(newProfile);
      }, 800);
    } catch (err: any) {
      console.error('Error al registrar usuario:', err);
      setErrorMsg(err?.message || 'Error al registrar usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-blue-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Cabecera con Branding */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-3 shadow-inner">
            <span className="text-3xl select-none">🍿</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Snacks Preventa</h2>
          <p className="text-emerald-100 text-xs mt-1 font-medium">
            Gestión Offline-First de Tiendas y Pedidos
          </p>
        </div>

        {/* Selector de Pestañas (Iniciar Sesión / Registrarse) */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 m-4 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(false);
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              !isRegistering
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegistering(true);
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              isRegistering
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrarse</span>
          </button>
        </div>

        {/* Mensajes de Alerta */}
        <div className="px-6">
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="p-6 space-y-4">
          {isRegistering && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Teléfono (Opcional)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej. 70012345"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Rol en el Sistema</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRol('preventista')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      rol === 'preventista'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Preventista</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRol('gerente')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      rol === 'gerente'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <span>Gerente</span>
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="preventista@snacks.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : isRegistering ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Crear Cuenta y Entrar</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Informativo */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            💡 La sesión se conservará en este dispositivo para trabajar sin conexión en la calle.
          </p>
        </div>

      </div>
    </div>
  );
}
