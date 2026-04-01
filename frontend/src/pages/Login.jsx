import { createSignal } from "solid-js";
import { useAuth } from "../context/AuthContext";
import { useNavigate, A } from "@solidjs/router";
import { showToast } from "../utils/toast";

function Login() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await auth.login(email(), password());

    if (result.success) {
      navigate("/dashboard");
      showToast.success(`¡Bienvenido, ${result.user.name}!`);
    } else {
      setError(result.error);
      showToast.error(result.error);
    }

    setLoading(false);
  };

  return (
    <div class="min-h-screen flex items-center justify-center page-bg">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold mb-2">Bienvenido</h1>
          <p class="text-gray-400">Inicia sesión en tu cuenta</p>
        </div>

        <div class="card">
          <form onSubmit={handleSubmit} class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                required
                class="input-field w-full"
                placeholder="tu@email.com"
                value={email()}
                onInput={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Contraseña</label>
              <input
                type="password"
                required
                class="input-field w-full"
                placeholder="••••••••"
                value={password()}
                onInput={(e) => setPassword(e.target.value)}
              />
            </div>

            {error() && (
              <div class="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-md text-sm">
                {error()}
              </div>
            )}

            <button
              type="submit"
              disabled={loading()}
              class="btn-primary w-full disabled:opacity-50"
            >
              {loading() ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          <div class="mt-6 text-center">
            <p class="text-gray-400 text-sm">
              ¿No tienes cuenta?{" "}
              <A href="/register" class="text-white hover:underline">
                Regístrate
              </A>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
