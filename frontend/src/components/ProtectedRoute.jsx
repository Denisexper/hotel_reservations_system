import { Navigate } from "@solidjs/router";
import { useAuth } from "../context/AuthContext";
import { Show } from "solid-js";

function ProtectedRoute(props) {
  const auth = useAuth();

  //Primero esperar a que termine de cargar
  return (
    <Show
      when={!auth.loading()}
      fallback={
        <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div class="text-center">
            <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Cargando...
            </p>
          </div>
        </div>
      }
    >
      {/* evaluar si está autenticado */}
      <Show when={auth.isAuthenticated()} fallback={<Navigate href="/login" />}>
        {props.children}
      </Show>
    </Show>
  );
}

export default ProtectedRoute;
