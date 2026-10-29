'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ClienteForm from '../components/ClienteForm';
import OrderForm from '../components/OrderForm';
import OrdersList from '../components/OrdersList';
import GerenciaDashboard from '../components/GerenciaDashboard';
import AuthScreen from '../components/AuthScreen';
import { UserRole, Cliente, Usuario } from '../types';
import { initLocalDatabase } from '../lib/db';
import { supabase } from '../lib/supabase';
import { PlusCircle, ShoppingCart, ClipboardList, Loader2 } from 'lucide-react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [role, setRole] = useState<UserRole>('preventista');
  const [activeTab, setActiveTab] = useState<'nuevo_cliente' | 'nuevo_pedido' | 'pedidos'>('nuevo_cliente');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  useEffect(() => {
    initLocalDatabase();

    const checkSession = async () => {
      // 1. Intentar cargar sesión guardada en localStorage (soporta modo Offline)
      try {
        const cached = localStorage.getItem('app_user_session');
        if (cached) {
          const userObj: Usuario = JSON.parse(cached);
          setCurrentUser(userObj);
          setRole(userObj.rol);
        }
      } catch (err) {
        console.warn('Error leyendo sesión local:', err);
      }

      // 2. Si hay conexión, validar sesión real con Supabase
      if (typeof window !== 'undefined' && navigator.onLine && supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            const sbUser = data.session.user;
            
            // Consultar datos de perfil en public.usuarios
            let profile: Usuario = {
              id: sbUser.id,
              email: sbUser.email || '',
              nombre_completo: sbUser.user_metadata?.nombre_completo || sbUser.email?.split('@')[0] || 'Usuario',
              rol: (sbUser.user_metadata?.rol as UserRole) || 'preventista',
              activo: true,
            };

            const { data: dbUser } = await supabase
              .from('usuarios')
              .select('*')
              .eq('id', sbUser.id)
              .single();

            if (dbUser) {
              profile = {
                id: dbUser.id,
                email: sbUser.email || '',
                nombre_completo: dbUser.nombre_completo || profile.nombre_completo,
                telefono: dbUser.telefono,
                rol: dbUser.rol as UserRole,
                activo: dbUser.activo ?? true,
              };
            }

            setCurrentUser(profile);
            setRole(profile.rol);
            localStorage.setItem('app_user_session', JSON.stringify(profile));
          }
        } catch (sbErr) {
          console.warn('Aviso al verificar sesión remota en Supabase:', sbErr);
        }
      }

      setLoadingSession(false);
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (usuario: Usuario) => {
    setCurrentUser(usuario);
    setRole(usuario.rol);
  };

  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Error al cerrar sesión remota:', err);
    } finally {
      localStorage.removeItem('app_user_session');
      setCurrentUser(null);
    }
  };

  const handleClienteCreated = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setActiveTab('nuevo_pedido');
  };

  // Pantalla de carga mientras se verifica la sesión
  if (loadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Iniciando Snacks Preventa...</p>
      </div>
    );
  }

  // Si no hay usuario autenticado, mostrar pantalla de Login / Registro
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Barra de navegación superior con información de usuario y botón de cerrar sesión */}
      <Navbar
        currentRole={role}
        onRoleChange={(newRole) => setRole(newRole)}
        preventistaId={currentUser.id}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {role === 'gerente' ? (
          // Vista de Gerencia
          <GerenciaDashboard />
        ) : (
          // Vista de Preventista (Móvil / Terreno)
          <div className="space-y-4">
            {/* Pestañas de Navegación Rápida para Preventistas */}
            <div className="flex bg-slate-200/80 p-1 rounded-2xl max-w-md mx-auto shadow-inner text-xs font-bold">
              <button
                onClick={() => {
                  setSelectedCliente(null);
                  setActiveTab('nuevo_cliente');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'nuevo_cliente'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Tienda</span>
              </button>

              <button
                onClick={() => setActiveTab('nuevo_pedido')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'nuevo_pedido'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Tomar Pedido</span>
              </button>

              <button
                onClick={() => setActiveTab('pedidos')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'pedidos'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Mis Pedidos</span>
              </button>
            </div>

            {/* Contenido según pestaña seleccionada */}
            <div className="mt-4">
              {activeTab === 'nuevo_cliente' && (
                <ClienteForm
                  preventistaId={currentUser.id}
                  onClienteCreated={handleClienteCreated}
                />
              )}

              {activeTab === 'nuevo_pedido' && (
                <OrderForm
                  preventistaId={currentUser.id}
                  selectedCliente={selectedCliente}
                  onOrderCompleted={() => setActiveTab('pedidos')}
                  onCancel={() => setActiveTab('pedidos')}
                  onNavigateToNewCliente={() => setActiveTab('nuevo_cliente')}
                />
              )}

              {activeTab === 'pedidos' && <OrdersList />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
