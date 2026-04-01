import { A, useNavigate } from '@solidjs/router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import ThemeToggle from '../ThemeToggle';
import { Show } from 'solid-js';

function Sidebar() {
  const auth = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.logout();
    navigate('/login')
  };

  const navLinkClass = (path) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
     hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400
     hover:text-gray-900 dark:hover:text-white`;

  return (
    <aside class="w-64 min-h-screen border-r border-gray-200 dark:border-gray-800 
                  bg-white dark:bg-black flex flex-col">

      {/* Logo */}
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
            <span class="text-white dark:text-black font-bold text-sm">A</span>
          </div>
          <div>
            <p class="font-semibold text-sm text-gray-900 dark:text-white">AdminPanel</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">{auth.user()?.role}</p>
          </div>
        </div>
      </div>

      {/* Navegacion */}
      <nav class="flex-1 px-3 py-4 space-y-1">

        {/* Dashboard - Todos los usuarios autenticados */}
        <A href="/dashboard" class={navLinkClass('/dashboard')}>
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </A>

        {/* Mostrar según PERMISOS, no por rol */}
        <Show when={auth.hasPermission('users.read') || auth.hasPermission('users.create') || auth.hasPermission('users.update')}>
          <div class="pt-4 pb-1">
            <p class="px-4 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">
              Administración
            </p>
          </div>

          <A href="/users" class={navLinkClass('/users')}>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Usuarios
          </A>
        </Show>

        {/* Roles - Solo si tiene permiso */}
        <Show when={auth.hasPermission('roles.read')}>
          <A href="/roles" class={navLinkClass('/roles')}>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Roles y Permisos
          </A>
        </Show>

        {/* Logs Solo si tiene permiso */}
        <Show when={auth.hasPermission('logs.read')}>
          <A href="/logs" class={navLinkClass('/logs')}>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Bitácoras
          </A>
        </Show>

      </nav>

      {/* Footer: Avatar + Theme */}
      <div class="px-3 py-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
        
        {/* Theme toggle */}
        <div class="flex items-center justify-between px-4">
          <span class="text-xs text-gray-500 dark:text-gray-400">Tema</span>
          <ThemeToggle />
        </div>

        {/* Avatar */}
        <div class="flex items-center gap-3 px-4 py-2 rounded-lg 
                    bg-gray-50 dark:bg-gray-900">
          <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 
                      flex items-center justify-center flex-shrink-0">
            <span class="text-sm font-semibold text-gray-600 dark:text-gray-300">
              {auth.user()?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
              {auth.user()?.name}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {auth.user()?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            class="text-gray-400 hover:text-red-500 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

      </div>
    </aside>
  );
}

export default Sidebar;