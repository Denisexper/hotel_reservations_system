import { createSignal, createResource, Show } from "solid-js";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const CrownIcon = (props) => (
    <svg
        class={props.class || "w-12 h-12"}
        viewBox="0 0 24 24"
        fill="none"
        stroke={props.color || "currentColor"}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${props.color})` }}
    >
        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
);

function LoyaltyCard() {
    const auth = useAuth();

    const [loyalty] = createResource(
        () => auth.isAuthenticated(),
        async (isAuth) => {
            if (!isAuth) return null;
            try {
                const result = await api.getMyLoyalty();
                return result.data;
            } catch {
                return null;
            }
        },
    );

    const progressPercent = () => {
        if (!loyalty()) return 0;
        const l = loyalty();
        if (!l.nextLevel) return 100; // Platino - max
        const current = l.reservationCount;
        const needed = current + l.reservationsToNextLevel;
        // Calculate within current level range
        const levelRanges = { Bronce: [0, 3], Plata: [3, 6], Oro: [6, 11] };
        const range = levelRanges[l.level] || [0, 3];
        const progress = ((current - range[0]) / (range[1] - range[0])) * 100;
        return Math.min(100, Math.max(0, progress));
    };

    return (
        <Show when={loyalty() && !loyalty.loading}>
            <div
                class="rounded-2xl border border-gray-100 overflow-hidden mb-8"
                style={{
                    background: `linear-gradient(135deg, ${loyalty().color}08 0%, ${loyalty().color}03 100%)`,
                    "border-color": `${loyalty().color}20`,
                }}
            >
                <div class="p-6" style={{ "font-family": "'Montserrat', sans-serif" }}>
                    <div class="flex items-center gap-5">
                        {/* Crown */}
                        <div class="flex-shrink-0">
                            <CrownIcon class="w-14 h-14" color={loyalty().color} />
                        </div>

                        {/* Info */}
                        <div class="flex-1">
                            <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Tu nivel de fidelidad</p>
                            <h3
                                class="text-2xl font-light mb-1"
                                style={{ color: loyalty().color, "font-family": "'Cormorant Garamond', serif" }}
                            >
                                Nivel {loyalty().level}
                            </h3>

                            <Show
                                when={loyalty().discount > 0}
                                fallback={
                                    <p class="text-sm text-gray-500">
                                        Completa más reservas para obtener descuentos exclusivos
                                    </p>
                                }
                            >
                                <p class="text-sm text-gray-600">
                                    Disfrutas un <span class="font-semibold" style={{ color: loyalty().color }}>{loyalty().discount}%</span> de descuento en tus reservas
                                </p>
                            </Show>
                        </div>

                        {/* Discount badge */}
                        <Show when={loyalty().discount > 0}>
                            <div
                                class="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center"
                                style={{
                                    "background-color": `${loyalty().color}15`,
                                    border: `1px solid ${loyalty().color}30`,
                                }}
                            >
                                <div class="text-center">
                                    <p class="text-lg font-bold" style={{ color: loyalty().color }}>{loyalty().discount}%</p>
                                    <p class="text-[8px] text-gray-400 uppercase">Dto.</p>
                                </div>
                            </div>
                        </Show>
                    </div>

                    {/* Progress bar */}
                    <div class="mt-5">
                        <div class="flex justify-between items-center mb-2">
                            <p class="text-xs text-gray-500">
                                {loyalty().reservationCount} reserva(s) completada(s)
                            </p>
                            <Show when={loyalty().nextLevel}>
                                <p class="text-xs text-gray-400">
                                    {loyalty().reservationCount + loyalty().reservationsToNextLevel} para {loyalty().nextLevel}
                                </p>
                            </Show>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                class="h-2.5 rounded-full transition-all duration-500"
                                style={{
                                    width: `${progressPercent()}%`,
                                    "background-color": loyalty().color,
                                }}
                            />
                        </div>
                    </div>

                    {/* Motivational text */}
                    <div class="mt-4">
                        <Show
                            when={loyalty().nextLevel}
                            fallback={
                                <p class="text-sm text-gray-500 text-center">
                                    🎉 ¡Felicidades! Eres cliente <strong>Platino</strong> con el máximo descuento de <strong>{loyalty().discount}%</strong>
                                </p>
                            }
                        >
                            <p class="text-sm text-gray-500 text-center">
                                ¡Te faltan <strong style={{ color: loyalty().color }}>{loyalty().reservationsToNextLevel}</strong> reserva(s) para alcanzar el nivel <strong>{loyalty().nextLevel}</strong> y obtener <strong>{loyalty().nextLevelDiscount}%</strong> de descuento!
                            </p>
                        </Show>
                    </div>
                </div>
            </div>
        </Show>
    );
}

export default LoyaltyCard;