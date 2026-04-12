import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Layout from '../components/layout/Layout';
import { Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';

function Dashboard() {
  const auth = useAuth();

  const navigate = useNavigate();

  // Si es cliente, redirigir a la landing
  if (auth.user()?.role === "cliente") {
    navigate("/");
    return null;
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div class="p-8 max-w-5xl mx-auto">

          {/* Header */}
          <div class="mb-8">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              Bienvenido, {auth.user()?.name} 👋
            </h1>
            <p class="text-gray-500 dark:text-gray-400 mt-1">
              Aquí tienes un resumen de tu cuenta
            </p>
          </div>

          {/* Cards de info */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="card">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Rol
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                {auth.user()?.role}
              </p>
            </div>

            <div class="card">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Email
              </p>
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                {auth.user()?.email}
              </p>
            </div>

            <div class="card">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Estado
              </p>
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                <p class="text-sm font-medium text-green-600 dark:text-green-400">Activo</p>
              </div>
            </div>
          </div>

          {/* Mensaje según rol */}
          <Show when={auth.user()?.role === 'user'}>
            <div class="card text-center py-12">
              <div class="text-5xl mb-4">🎉</div>
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                ¡Bienvenido al sistema!
              </h2>
              <p class="text-gray-500 dark:text-gray-400">
                Tu cuenta está activa y funcionando correctamente.
              </p>
            </div>
          </Show>

          <Show when={auth.isAdmin()}>
            <div class="card">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Accesos rápidos
              </h2>
              <div class="grid grid-cols-2 gap-4">
                <a href="/users" class="card hover:border-gray-400 dark:hover:border-gray-600 
                                        transition-colors cursor-pointer text-center py-6">
                  <div class="text-3xl mb-2">👥</div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">Gestionar usuarios</p>
                </a>
                <a href="/logs" class="card hover:border-gray-400 dark:hover:border-gray-600 
                                       transition-colors cursor-pointer text-center py-6">
                  <div class="text-3xl mb-2">📋</div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">Ver bitácoras</p>
                </a>
              </div>
            </div>
          </Show>

        </div>
      </Layout>
    </ProtectedRoute>
  );
}

export default Dashboard;