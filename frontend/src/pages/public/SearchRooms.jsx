import { createSignal, createResource, Show, For, onMount } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PublicLayout from "../../components/public/PublicLayout";
import Pagination from "../../components/Pagination";

const BACKEND_URL = "http://localhost:4000";

const PLACEHOLDER_IMAGES = {
    Simple: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&h=400&fit=crop",
    Doble: "https://images.unsplash.com/photo-1590490360182-c33d955ca90d?w=600&h=400&fit=crop",
    Suite: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop",
    Deluxe: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop",
    Presidencial: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop",
};

function SearchRooms() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const auth = useAuth();

    // Form state
    const [checkIn, setCheckIn] = createSignal(searchParams.checkIn || "");
    const [checkOut, setCheckOut] = createSignal(searchParams.checkOut || "");
    const [guests, setGuests] = createSignal(parseInt(searchParams.guests) || 2);
    const [roomType, setRoomType] = createSignal(searchParams.type || "");
    const [minPrice, setMinPrice] = createSignal(searchParams.minPrice || "");
    const [maxPrice, setMaxPrice] = createSignal(searchParams.maxPrice || "");
    const [currentPage, setCurrentPage] = createSignal(1);
    const [hasSearched, setHasSearched] = createSignal(false);

    // Resource
    const [rooms, { refetch }] = createResource(
        () => {
            if (!checkIn() || !checkOut()) return null;
            return {
                checkIn: checkIn(),
                checkOut: checkOut(),
                guests: guests(),
                type: roomType(),
                minPrice: minPrice(),
                maxPrice: maxPrice(),
                page: currentPage(),
                limit: 8,
            };
        },
        async (params) => {
            if (!params) return null;
            const filters = {};
            Object.entries(params).forEach(([key, val]) => {
                if (val !== "" && val !== null && val !== undefined) filters[key] = val;
            });
            setHasSearched(true);
            return api.searchAvailableRooms(filters);
        },
    );

    // Auto-search si vienen params
    onMount(() => {
        if (searchParams.checkIn && searchParams.checkOut) {
            // Trigger search automatically
        }
    });

    const todayStr = () => new Date().toISOString().split("T")[0];

    const handleSearch = (e) => {
        e.preventDefault();
        if (!checkIn() || !checkOut()) return;
        setCurrentPage(1);
        setSearchParams({
            checkIn: checkIn(),
            checkOut: checkOut(),
            guests: guests().toString(),
            type: roomType(),
        });
        refetch();
    };

    const handleBooking = (room) => {
        if (!auth.isAuthenticated()) {
            const returnUrl = `/room/${room._id}?checkIn=${checkIn()}&checkOut=${checkOut()}&guests=${guests()}`;
            navigate(`/client-login?returnUrl=${encodeURIComponent(returnUrl)}`);
            return;
        }
        navigate(`/room/${room._id}?checkIn=${checkIn()}&checkOut=${checkOut()}&guests=${guests()}`);
    };

    const getRoomImage = (room) => {
        if (room.images && room.images.length > 0) {
            return `${BACKEND_URL}${room.images[0]}`;
        }
        return PLACEHOLDER_IMAGES[room.type] || PLACEHOLDER_IMAGES.Simple;
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(price || 0);
    };

    const calculateNights = () => {
        if (!checkIn() || !checkOut()) return 0;
        const diff = new Date(checkOut() + "T12:00:00") - new Date(checkIn() + "T12:00:00");
        return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const amenityIcons = {
        WiFi: "M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0",
        AC: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
        TV: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
        Minibar: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    };

    return (
        <PublicLayout transparent={false}>
            <div class="pt-24 pb-16 min-h-screen bg-[#f8f9fa]">
                <div class="max-w-7xl mx-auto px-6 lg:px-8">
                    {/* Header */}
                    <div class="mb-8">
                        <h1
                            class="text-3xl md:text-4xl font-light text-[#1a1a2e]"
                            style={{ "font-family": "'Cormorant Garamond', serif" }}
                        >
                            Buscar Habitaciones
                        </h1>
                        <p
                            class="text-gray-500 mt-2"
                            style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}
                        >
                            Encuentra la habitación perfecta para tu estancia
                        </p>
                    </div>

                    {/* Search Bar */}
                    <form
                        onSubmit={handleSearch}
                        class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8"
                        style={{ "font-family": "'Montserrat', sans-serif" }}
                    >
                        <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Check-In</label>
                                <input
                                    type="date" class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c] transition-colors"
                                    min={todayStr()} value={checkIn()} onInput={(e) => setCheckIn(e.target.value)} required
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Check-Out</label>
                                <input
                                    type="date" class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c] transition-colors"
                                    min={checkIn() || todayStr()} value={checkOut()} onInput={(e) => setCheckOut(e.target.value)} required
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Huéspedes</label>
                                <select class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c]" value={guests()} onChange={(e) => setGuests(parseInt(e.target.value))}>
                                    <For each={[1, 2, 3, 4, 5, 6]}>{(n) => <option value={n}>{n}</option>}</For>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Tipo</label>
                                <select class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c]" value={roomType()} onChange={(e) => setRoomType(e.target.value)}>
                                    <option value="">Todas</option>
                                    <option value="Simple">Simple</option>
                                    <option value="Doble">Doble</option>
                                    <option value="Suite">Suite</option>
                                    <option value="Deluxe">Deluxe</option>
                                    <option value="Presidencial">Presidencial</option>
                                    <option value="Single">Single</option>
                                    <option value="Triple">Triple</option>
                                    <option value="Twin">Twin</option>

                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Precio Min</label>
                                <input type="number" class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c]" placeholder="$0" value={minPrice()} onInput={(e) => setMinPrice(e.target.value)} />
                            </div>
                            <div class="flex items-end">
                                <button type="submit" class="w-full py-2.5 bg-[#1a1a2e] hover:bg-[#2a2a4e] text-white rounded-lg text-sm font-medium transition-colors tracking-wide">
                                    Buscar
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Results */}
                    <Show when={rooms.loading}>
                        <div class="text-center py-16 text-gray-500" style={{ "font-family": "'Montserrat', sans-serif" }}>
                            <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#c9a84c] border-r-transparent mb-4"></div>
                            <p>Buscando habitaciones disponibles...</p>
                        </div>
                    </Show>

                    <Show when={!checkIn() || !checkOut()}>
                        <Show when={!hasSearched()}>
                            <div class="text-center py-20" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                <svg class="w-16 h-16 mx-auto text-gray-300 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p class="text-gray-500 text-lg">Selecciona las fechas para buscar disponibilidad</p>
                            </div>
                        </Show>
                    </Show>

                    <Show when={rooms() && !rooms.loading}>
                        <Show
                            when={rooms()?.data?.length > 0}
                            fallback={
                                <div class="text-center py-16" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                    <svg class="w-16 h-16 mx-auto text-gray-300 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p class="text-gray-500 text-lg mb-2">No encontramos habitaciones disponibles</p>
                                    <p class="text-gray-400 text-sm">Intenta con otras fechas o menos huéspedes</p>
                                </div>
                            }
                        >
                            {/* Results count */}
                            <div class="flex items-center justify-between mb-6" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                <p class="text-sm text-gray-500">
                                    {rooms().total} habitación(es) disponible(s)
                                    <Show when={calculateNights() > 0}>
                                        <span> • {calculateNights()} noche(s)</span>
                                    </Show>
                                </p>
                            </div>

                            {/* Room cards */}
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <For each={rooms().data}>
                                    {(room) => (
                                        <div class="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
                                            <div class="flex flex-col md:flex-row">
                                                {/* Image */}
                                                <div class="md:w-64 h-56 md:h-auto relative overflow-hidden flex-shrink-0">
                                                    <img
                                                        src={getRoomImage(room)}
                                                        alt={`Habitación ${room.roomNumber}`}
                                                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                    />
                                                    <Show when={room.season}>
                                                        <div class="absolute top-3 left-3 px-2.5 py-1 bg-[#c9a84c] text-white text-xs font-medium rounded-md" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                                            {room.season?.name || "Temporada"}
                                                        </div>
                                                    </Show>
                                                </div>

                                                {/* Info */}
                                                <div class="flex-1 p-5 flex flex-col justify-between">
                                                    <div>
                                                        <div class="flex items-start justify-between mb-2">
                                                            <div>
                                                                <h3
                                                                    class="text-xl font-semibold text-[#1a1a2e]"
                                                                    style={{ "font-family": "'Cormorant Garamond', serif" }}
                                                                >
                                                                    #{room.roomNumber} — {room.type}
                                                                </h3>
                                                                <p class="text-xs text-gray-400 mt-0.5" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                                                    Piso {room.floor || "—"} • Hasta {room.capacity} persona(s)
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Amenities */}
                                                        <Show when={room.amenities?.length > 0}>
                                                            <div class="flex flex-wrap gap-1.5 my-3">
                                                                <For each={room.amenities.slice(0, 6)}>
                                                                    {(a) => (
                                                                        <span class="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md border border-gray-100" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                                                            {a}
                                                                        </span>
                                                                    )}
                                                                </For>
                                                            </div>
                                                        </Show>

                                                        <Show when={room.description}>
                                                            <p class="text-sm text-gray-500 line-clamp-2 mb-3" style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}>
                                                                {room.description}
                                                            </p>
                                                        </Show>
                                                    </div>

                                                    {/* Price + Actions */}
                                                    <div class="flex items-end justify-between mt-auto pt-3 border-t border-gray-50">
                                                        <div>
                                                            <Show
                                                                when={room.adjustedPrice && room.adjustedPrice !== room.basePrice}
                                                                fallback={
                                                                    <p style={{ "font-family": "'Montserrat', sans-serif" }}>
                                                                        <span class="text-2xl font-semibold text-[#1a1a2e]">{formatPrice(room.basePrice)}</span>
                                                                        <span class="text-xs text-gray-400"> /noche</span>
                                                                    </p>
                                                                }
                                                            >
                                                                <p style={{ "font-family": "'Montserrat', sans-serif" }}>
                                                                    <span class="text-2xl font-semibold text-[#1a1a2e]">{formatPrice(room.adjustedPrice)}</span>
                                                                    <span class="text-xs text-gray-400"> /noche</span>
                                                                </p>
                                                                <p class="flex items-center gap-2 mt-0.5">
                                                                    <span class="text-xs line-through text-gray-400">{formatPrice(room.basePrice)}</span>
                                                                    <Show when={room.season?.modifierType === "porcentaje"}>
                                                                        <span class="text-xs text-[#c9a84c] font-medium">+{room.season.modifierValue}%</span>
                                                                    </Show>
                                                                </p>
                                                            </Show>
                                                            <Show when={calculateNights() > 0}>
                                                                <p class="text-xs text-gray-400 mt-1" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                                                    Total: {formatPrice((room.adjustedPrice || room.basePrice) * calculateNights())}
                                                                </p>
                                                            </Show>
                                                        </div>
                                                        <div class="flex gap-2">
                                                            <button
                                                                onClick={() => navigate(`/room/${room._id}?checkIn=${checkIn()}&checkOut=${checkOut()}&guests=${guests()}`)}
                                                                class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:border-gray-400 transition-colors"
                                                                style={{ "font-family": "'Montserrat', sans-serif" }}
                                                            >
                                                                Detalle
                                                            </button>
                                                            <button
                                                                onClick={() => handleBooking(room)}
                                                                class="px-5 py-2 bg-[#c9a84c] hover:bg-[#b8963f] text-white rounded-lg text-xs font-medium transition-colors"
                                                                style={{ "font-family": "'Montserrat', sans-serif" }}
                                                            >
                                                                Reservar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </div>

                            {/* Pagination */}
                            <Show when={rooms()?.pagination?.totalPages > 1}>
                                <div class="mt-8">
                                    <Pagination
                                        currentPage={currentPage()}
                                        totalPages={rooms().pagination.totalPages}
                                        onPageChange={(p) => setCurrentPage(p)}
                                    />
                                </div>
                            </Show>
                        </Show>
                    </Show>
                </div>
            </div>
        </PublicLayout>
    );
}

export default SearchRooms;