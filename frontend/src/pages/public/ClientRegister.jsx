import { createSignal } from "solid-js";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useSearchParams, A } from "@solidjs/router";
import { showToast } from "../../utils/toast";
import PublicLayout from "../../components/public/PublicLayout";

function ClientRegister() {
    const [name, setName] = createSignal("");
    const [email, setEmail] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [confirmPassword, setConfirmPassword] = createSignal("");
    const [error, setError] = createSignal("");
    const [loading, setLoading] = createSignal(false);

    const auth = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password().length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        if (password() !== confirmPassword()) {
            setError("Las contraseñas no coinciden");
            return;
        }

        setLoading(true);

        const result = await auth.register(name(), email(), password());

        if (result.success) {
            showToast.success("¡Cuenta creada exitosamente!");

            // Auto-login después del registro
            const loginResult = await auth.login(email(), password());

            if (loginResult.success) {
                const returnUrl = searchParams.returnUrl;
                if (returnUrl) {
                    navigate(decodeURIComponent(returnUrl));
                } else {
                    navigate("/");
                }
            } else {
                // Si el auto-login falla, enviar al login del cliente
                navigate(`/client-login${searchParams.returnUrl ? `?returnUrl=${searchParams.returnUrl}` : ""}`);
            }
        } else {
            setError(result.error);
            showToast.error(result.error);
        }

        setLoading(false);
    };

    return (
        <PublicLayout transparent={false}>
            <div class="pt-28 pb-20 min-h-screen bg-[#f8f9fa] flex items-center justify-center">
                <div class="w-full max-w-md px-6">
                    {/* Header */}
                    <div class="text-center mb-8">
                        <div class="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#1a1a2e] flex items-center justify-center">
                            <span
                                class="text-white text-2xl font-bold"
                                style={{ "font-family": "'Cormorant Garamond', serif" }}
                            >
                                H
                            </span>
                        </div>
                        <h1
                            class="text-3xl font-light text-[#1a1a2e] mb-2"
                            style={{ "font-family": "'Cormorant Garamond', serif" }}
                        >
                            Crear Cuenta
                        </h1>
                        <p
                            class="text-gray-500 text-sm"
                            style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}
                        >
                            Regístrate para reservar habitaciones y gestionar tus estancias
                        </p>
                    </div>

                    {/* Form Card */}
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <form onSubmit={handleSubmit} class="space-y-5" style={{ "font-family": "'Montserrat', sans-serif" }}>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                                    Nombre completo
                                </label>
                                <input
                                    type="text"
                                    required
                                    class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#c9a84c] transition-colors"
                                    placeholder="Tu nombre"
                                    value={name()}
                                    onInput={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#c9a84c] transition-colors"
                                    placeholder="tu@email.com"
                                    value={email()}
                                    onInput={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    required
                                    class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#c9a84c] transition-colors"
                                    placeholder="Mínimo 6 caracteres"
                                    value={password()}
                                    onInput={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                                    Confirmar contraseña
                                </label>
                                <input
                                    type="password"
                                    required
                                    class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#c9a84c] transition-colors"
                                    placeholder="Repite tu contraseña"
                                    value={confirmPassword()}
                                    onInput={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            {error() && (
                                <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {error()}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading()}
                                class="w-full py-3.5 bg-[#c9a84c] hover:bg-[#b8963f] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 tracking-wide"
                            >
                                {loading() ? "Creando cuenta..." : "Crear Cuenta"}
                            </button>
                        </form>

                        <div class="mt-6 text-center">
                            <p class="text-gray-500 text-sm" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                ¿Ya tienes cuenta?{" "}
                                <A
                                    href={`/client-login${searchParams.returnUrl ? `?returnUrl=${searchParams.returnUrl}` : ""}`}
                                    class="text-[#c9a84c] hover:underline font-medium"
                                >
                                    Inicia sesión
                                </A>
                            </p>
                        </div>
                    </div>

                    {/* Link al registro de admin */}
                    <div class="mt-6 text-center">
                        <A
                            href="/login"
                            class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            style={{ "font-family": "'Montserrat', sans-serif" }}
                        >
                            Acceso para personal del hotel →
                        </A>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}

export default ClientRegister;