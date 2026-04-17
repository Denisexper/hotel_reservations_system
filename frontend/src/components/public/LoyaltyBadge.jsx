import { createSignal, createResource, Show } from "solid-js";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function LoyaltyBadge() {
    const auth = useAuth();

    const [loyalty] = createResource(
        () => auth.isAuthenticated() && auth.user()?.role === "cliente",
        async (isClient) => {
            if (!isClient) return null;
            try {
                const result = await api.getMyLoyalty();
                return result.data;
            } catch {
                return null;
            }
        },
    );

    return (
        <Show when={loyalty()}>
            <div class="relative group" title={`Nivel ${loyalty().level}`}>
                <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={loyalty().color}
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style={{ filter: `drop-shadow(0 0 3px ${loyalty().color})` }}
                >
                    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                </svg>
                {/* Tooltip */}
                <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span
                        class="text-[10px] px-2 py-1 rounded-md whitespace-nowrap font-medium"
                        style={{
                            "background-color": `${loyalty().color}20`,
                            color: loyalty().color,
                            border: `1px solid ${loyalty().color}30`,
                        }}
                    >
                        {loyalty().level}
                    </span>
                </div>
            </div>
        </Show>
    );
}

export default LoyaltyBadge;