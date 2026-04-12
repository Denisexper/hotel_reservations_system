import { createSignal } from "solid-js";
import { useAuth } from "../context/AuthContext";
import { useNavigate, A } from "@solidjs/router";
import { showToast } from "../utils/toast";
import hotelLogo from "../assets/hotel_icon.png";

function Login() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [visible, setVisible] = createSignal(false);

  const auth = useAuth();
  const navigate = useNavigate();

  // Animación de entrada
  setTimeout(() => setVisible(true), 50);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await auth.login(email(), password());

    if (result.success) {
      showToast.success(`¡Bienvenido, ${result.user.name}!`);
      navigate("/dashboard");
    } else {
      setError(result.error);
      showToast.error(result.error);
    }

    setLoading(false);
  };

  return (
    <div class="min-h-screen flex">
      {/* Google Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Panel izquierdo — Branding */}
      <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#1a1a2e]">
        {/* Patrón decorativo */}
        <div class="absolute inset-0 opacity-[0.03]"
          style={{
            "background-image": `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Gradiente decorativo */}
        <div class="absolute top-0 right-0 w-96 h-96 bg-[#c9a84c]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div class="absolute bottom-0 left-0 w-80 h-80 bg-[#4361ee]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Contenido */}
        <div class="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#c9a84c] flex items-center justify-center">
              <img src={hotelLogo} alt="Logo" class="w-6 h-6 object-contain" />
            </div>
            <span
              class="text-white text-lg tracking-wide"
              style={{ "font-family": "'Cormorant Garamond', serif" }}
            >
              Hotel Reservations
            </span>
          </div>

          {/* Mensaje central */}
          <div>
            <h1
              class="text-5xl font-light text-white leading-tight mb-6"
              style={{ "font-family": "'Cormorant Garamond', serif" }}
            >
              Panel de
              <br />
              <span class="text-[#c9a84c]">Administración</span>
            </h1>
            <p
              class="text-white/40 text-sm leading-relaxed max-w-sm"
              style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}
            >
              Gestiona habitaciones, reservas, pagos y reportes del hotel
              desde un solo lugar. Acceso exclusivo para personal autorizado.
            </p>

            {/* Estadísticas decorativas */}
            <div class="grid grid-cols-3 gap-6 mt-10">
              <div>
                <p
                  class="text-2xl font-light text-[#c9a84c]"
                  style={{ "font-family": "'Cormorant Garamond', serif" }}
                >
                  24/7
                </p>
                <p
                  class="text-[10px] text-white/30 uppercase tracking-widest mt-1"
                  style={{ "font-family": "'Montserrat', sans-serif" }}
                >
                  Monitoreo
                </p>
              </div>
              <div>
                <p
                  class="text-2xl font-light text-[#c9a84c]"
                  style={{ "font-family": "'Cormorant Garamond', serif" }}
                >
                  100%
                </p>
                <p
                  class="text-[10px] text-white/30 uppercase tracking-widest mt-1"
                  style={{ "font-family": "'Montserrat', sans-serif" }}
                >
                  Seguro
                </p>
              </div>
              <div>
                <p
                  class="text-2xl font-light text-[#c9a84c]"
                  style={{ "font-family": "'Cormorant Garamond', serif" }}
                >
                  v1.0
                </p>
                <p
                  class="text-[10px] text-white/30 uppercase tracking-widest mt-1"
                  style={{ "font-family": "'Montserrat', sans-serif" }}
                >
                  Versión
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p
            class="text-white/20 text-xs"
            style={{ "font-family": "'Montserrat', sans-serif" }}
          >
            © {new Date().getFullYear()} Hotel Reservations. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Panel derecho — Formulario */}
      <div class="w-full lg:w-1/2 flex items-center justify-center bg-[#0a0a14] relative">
        {/* Gradiente sutil */}
        <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#0a0a14] via-[#0f0f1a] to-[#0a0a14]" />

        <div
          class={`relative z-10 w-full max-w-md px-8 transition-all duration-700 ${visible() ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          {/* Logo mobile */}
          <div class="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div class="w-12 h-12 rounded-xl bg-[#c9a84c] flex items-center justify-center">
              <span
                class="text-white text-xl font-bold"
                style={{ "font-family": "'Cormorant Garamond', serif" }}
              >
                H
              </span>
            </div>
          </div>

          {/* Header */}
          <div class="mb-8">
            <h2
              class="text-3xl font-light text-white mb-2"
              style={{ "font-family": "'Cormorant Garamond', serif" }}
            >
              Bienvenido
            </h2>
            <p
              class="text-white/40 text-sm"
              style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}
            >
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          {/* Logo/Icono del formulario */}
          <div class="flex justify-center mb-8">
            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#2a2a4e] border border-white/5 flex items-center justify-center shadow-xl">
              {/* Reemplaza este src con la ruta de tu logo */}
              <img
                src={hotelLogo}
                alt="Logo"
                class="w-12 h-12 object-contain"
                onError={(e) => {
                  // Fallback si no existe la imagen
                  e.target.style.display = "none";
                  e.target.parentElement.innerHTML = `<span style="font-family: 'Cormorant Garamond', serif; font-size: 2rem; color: #c9a84c; font-weight: 600;">H</span>`;
                }}
              />
            </div>
          </div>

          {/* Formulario */}
          <form
            onSubmit={handleSubmit}
            class="space-y-5"
            style={{ "font-family": "'Montserrat', sans-serif" }}
          >
            <div>
              <label class="block text-[10px] font-medium text-white/40 mb-2 uppercase tracking-widest">
                Email
              </label>
              <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg class="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  required
                  class="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#c9a84c]/50 focus:bg-white/[0.05] transition-all"
                  placeholder="tu@email.com"
                  value={email()}
                  onInput={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-medium text-white/40 mb-2 uppercase tracking-widest">
                Contraseña
              </label>
              <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg class="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  required
                  class="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#c9a84c]/50 focus:bg-white/[0.05] transition-all"
                  placeholder="••••••••"
                  value={password()}
                  onInput={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Error */}
            {error() && (
              <div class="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error()}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading()}
              class="w-full py-3.5 bg-gradient-to-r from-[#c9a84c] to-[#b8963f] hover:from-[#d4b35a] hover:to-[#c9a84c] text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 tracking-wide shadow-lg shadow-[#c9a84c]/10"
            >
              {loading() ? (
                <span class="flex items-center justify-center gap-2">
                  <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Iniciando sesión...
                </span>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          {/* Registro */}
          {/* <div class="mt-8 text-center">
            <p class="text-white/30 text-sm" style={{ "font-family": "'Montserrat', sans-serif" }}>
              ¿No tienes cuenta?{" "}
              <A href="/register" class="text-[#c9a84c] hover:text-[#d4b35a] transition-colors font-medium">
                Regístrate
              </A>
            </p>
          </div> */}

          {/* Separador */}
          <div class="flex items-center gap-4 mt-6">
            <div class="flex-1 h-px bg-white/[0.06]" />
            <span class="text-[10px] text-white/20 uppercase tracking-widest" style={{ "font-family": "'Montserrat', sans-serif" }}>
              o
            </span>
            <div class="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Link a landing */}
          <div class="mt-6 text-center">
            <A
              href="/"
              class="text-xs text-white/20 hover:text-white/40 transition-colors inline-flex items-center gap-1.5"
              style={{ "font-family": "'Montserrat', sans-serif" }}
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Sitio del hotel
            </A>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;