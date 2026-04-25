import { createSignal } from "solid-js";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "@solidjs/router";
import { showToast } from "../../utils/toast";
import { api } from "../../services/api";
import PublicLayout from "../../components/public/PublicLayout";

function ChangePassword() {
    const [currentPassword, setCurrentPassword] = createSignal("");
    const [newPassword, setNewPassword] = createSignal("");
    const [confirmPassword, setConfirmPassword] = createSignal("");
    const [error, setError] = createSignal("");
    const [loading, setLoading] = createSignal(false);

    const auth = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (newPassword().length < 6) {
            setError("La nueva contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (newPassword() !== confirmPassword()) {
            setError("Las contraseñas nuevas no coinciden.");
            return;
        }

        setLoading(true);

        try {
            await api.changePassword(currentPassword(), newPassword());
            auth.setMustChangePassword(false);
            showToast.success("Contraseña actualizada correctamente");
            navigate("/");
        } catch (err) {
            setError(err.message);
            showToast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PublicLayout transparent={false}>
            <div class="pt-28 pb-20 min-h-screen bg-[#f8f9fa] flex items-center justify-center">
                <div class="w-full max-w-md px-6">
                    {/* Header */}
                    <div class="text-center mb-8">
                        <div class="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#1a1a2e] flex items-center justify-center">
                            <svg class="w-7 h-7 text-[#c9a84c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1
                            class="text-3xl font-light text-[#1a1a2e] mb-2"
                            style={{ "font-family": "'Cormorant Garamond', serif" }}
                        >
                            Cambiar Contraseña
                        </h1>
                        <p
                            class="text-gray-500 text-sm max-w-xs mx-auto"
                            style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}
                        >
                            Por seguridad, debes cambiar tu contraseña temporal antes de continuar.
                        </p>
                    </div>

                    {/* Form Card */}
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        {/* Info banner */}
                        <div class="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                            <svg class="w-5 h-5 text-[#c9a84c] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p class="text-xs text-amber-800" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                Recibiste una contraseña temporal por correo. Por favor, establece una nueva contraseña segura para continuar.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} class="space-y-5" style={{ "font-family": "'Montserrat', sans-serif" }}>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                                    Contraseña Actual
                                </label>
                                <input
                                    type="password"
                                    required
                                    class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#c9a84c] transition-colors"
                                    placeholder="Tu contraseña temporal"
                                    value={currentPassword()}
                                    onInput={(e) => setCurrentPassword(e.target.value)}
                                />
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                                    Nueva Contraseña
                                </label>
                                <input
                                    type="password"
                                    required
                                    class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#c9a84c] transition-colors"
                                    placeholder="Mínimo 6 caracteres"
                                    value={newPassword()}
                                    onInput={(e) => setNewPassword(e.target.value)}
                                />
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                                    Confirmar Nueva Contraseña
                                </label>
                                <input
                                    type="password"
                                    required
                                    class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#c9a84c] transition-colors"
                                    placeholder="Repite la nueva contraseña"
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
                                class="w-full py-3.5 bg-[#1a1a2e] hover:bg-[#2a2a4e] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 tracking-wide"
                            >
                                {loading() ? "Guardando..." : "Establecer Nueva Contraseña"}
                            </button>
                        </form>
                    </div>

                    <div class="mt-6 text-center">
                        <p class="text-xs text-gray-400" style={{ "font-family": "'Montserrat', sans-serif" }}>
                            Si tienes problemas, contacta al personal del hotel.
                        </p>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}

export default ChangePassword;
