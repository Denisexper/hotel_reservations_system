import { createSignal, createResource, Show, For, onMount } from "solid-js";
import { useParams, useSearchParams, useNavigate } from "@solidjs/router";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { showToast } from "../../utils/toast";
import PublicLayout from "../../components/public/PublicLayout";

const BACKEND_URL = "http://localhost:4000";

const PLACEHOLDER_IMAGES = {
    Simple: "https://placehold.co/1200x800/1a1a2e/c9a84c?text=Simple",
    Doble: "https://placehold.co/1200x800/1a1a2e/c9a84c?text=Doble",
    Suite: "https://placehold.co/1200x800/1a1a2e/c9a84c?text=Suite",
    Deluxe: "https://placehold.co/1200x800/1a1a2e/c9a84c?text=Deluxe",
    Presidencial: "https://placehold.co/1200x800/1a1a2e/c9a84c?text=Presidencial",
};

function RoomDetail() {
    const params = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const auth = useAuth();

    // Room data
    const [room] = createResource(() => params.id, (id) => api.getRoom(id));

    // Image carousel
    const [currentImage, setCurrentImage] = createSignal(0);

    // Booking form
    const [checkIn, setCheckIn] = createSignal(searchParams.checkIn || "");
    const [checkOut, setCheckOut] = createSignal(searchParams.checkOut || "");
    const [guests, setGuests] = createSignal(parseInt(searchParams.guests) || 2);
    const [checking, setChecking] = createSignal(false);
    const [availability, setAvailability] = createSignal(null); // null = not checked, true/false
    const [booking, setBooking] = createSignal(false);

    // Seasonal price check
    const [seasonalInfo, setSeasonalInfo] = createSignal(null);

    const todayStr = () => new Date().toISOString().split("T")[0];

    const formatPrice = (price) => {
        return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(price || 0);
    };

    const formatDate = (date) => {
        if (!date) return "—";
        const d = typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)
            ? new Date(date + "T12:00:00")
            : new Date(date);
        return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    };

    const calculateNights = () => {
        if (!checkIn() || !checkOut()) return 0;
        const diff = new Date(checkOut() + "T12:00:00") - new Date(checkIn() + "T12:00:00");
        return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const getImages = () => {
        const r = room()?.data;
        if (!r) return [];
        if (r.images && r.images.length > 0) {
            return r.images.map((img) => `${BACKEND_URL}${img}`);
        }
        return [PLACEHOLDER_IMAGES[r.type] || PLACEHOLDER_IMAGES.Simple];
    };

    // Check availability
    const checkAvailability = async () => {
        if (!checkIn() || !checkOut()) {
            showToast.error("Selecciona las fechas");
            return;
        }
        setChecking(true);
        setAvailability(null);
        try {
            const [availRes, priceRes] = await Promise.all([
                api.checkAvailability(params.id, checkIn(), checkOut()),
                api.checkSeasonalPrice(params.id, checkIn()),
            ]);
            setAvailability(availRes.available);
            setSeasonalInfo(priceRes.data);
        } catch (error) {
            showToast.error(error.message);
        }
        setChecking(false);
    };

    // Book room
    const handleBooking = async () => {
        if (!auth.isAuthenticated()) {
            const returnUrl = `/room/${params.id}?checkIn=${checkIn()}&checkOut=${checkOut()}&guests=${guests()}`;
            navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
            return;
        }

        setBooking(true);
        try {
            await api.createReservation({
                room: params.id,
                checkIn: checkIn(),
                checkOut: checkOut(),
                numberOfGuests: guests(),
            });
            showToast.success("Reserva creada exitosamente");
            navigate("/reservations");
        } catch (error) {
            showToast.error(error.message);
        }
        setBooking(false);
    };

    const prevImage = () => {
        const images = getImages();
        setCurrentImage((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    };

    const nextImage = () => {
        const images = getImages();
        setCurrentImage((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    };

    const pricePerNight = () => {
        if (seasonalInfo()) return seasonalInfo().adjustedPrice;
        return room()?.data?.basePrice || 0;
    };

    return (
        <PublicLayout transparent={false}>
            <div class="pt-24 pb-16 min-h-screen bg-[#f8f9fa]">
                <Show
                    when={room() && !room.loading}
                    fallback={
                        <div class="text-center py-20 text-gray-500">
                            <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#c9a84c] border-r-transparent mb-4"></div>
                            <p style={{ "font-family": "'Montserrat', sans-serif" }}>Cargando habitación...</p>
                        </div>
                    }
                >
                    <Show when={room()?.data}>
                        {(r) => {
                            const roomData = r();
                            return (
                                <div class="max-w-7xl mx-auto px-6 lg:px-8">
                                    {/* Breadcrumb */}
                                    <div class="mb-6 flex items-center gap-2 text-sm text-gray-500" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                        <button onClick={() => navigate("/")} class="hover:text-[#1a1a2e] transition-colors">Inicio</button>
                                        <span>/</span>
                                        <button onClick={() => navigate("/search")} class="hover:text-[#1a1a2e] transition-colors">Habitaciones</button>
                                        <span>/</span>
                                        <span class="text-[#1a1a2e]">#{roomData.roomNumber}</span>
                                    </div>

                                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* Left: Images + Info */}
                                        <div class="lg:col-span-2 space-y-8">
                                            {/* Image Carousel */}
                                            <div class="relative rounded-2xl overflow-hidden bg-gray-200 aspect-[16/9]">
                                                <img
                                                    src={getImages()[currentImage()]}
                                                    alt={`Habitación ${roomData.roomNumber}`}
                                                    class="w-full h-full object-cover"
                                                />

                                                <Show when={getImages().length > 1}>
                                                    <button
                                                        onClick={prevImage}
                                                        class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                                                    >
                                                        ‹
                                                    </button>
                                                    <button
                                                        onClick={nextImage}
                                                        class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                                                    >
                                                        ›
                                                    </button>

                                                    {/* Dots */}
                                                    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                                        <For each={getImages()}>
                                                            {(_, i) => (
                                                                <button
                                                                    onClick={() => setCurrentImage(i())}
                                                                    class={`w-2.5 h-2.5 rounded-full transition-all ${currentImage() === i() ? "bg-white scale-110" : "bg-white/50"
                                                                        }`}
                                                                />
                                                            )}
                                                        </For>
                                                    </div>

                                                    {/* Counter */}
                                                    <div class="absolute top-4 right-4 px-3 py-1 bg-black/40 text-white text-xs rounded-full" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                                        {currentImage() + 1} / {getImages().length}
                                                    </div>
                                                </Show>
                                            </div>

                                            {/* Thumbnails */}
                                            <Show when={getImages().length > 1}>
                                                <div class="flex gap-2 overflow-x-auto pb-2">
                                                    <For each={getImages()}>
                                                        {(img, i) => (
                                                            <button
                                                                onClick={() => setCurrentImage(i())}
                                                                class={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${currentImage() === i() ? "border-[#c9a84c]" : "border-transparent opacity-60 hover:opacity-100"
                                                                    }`}
                                                            >
                                                                <img src={img} alt="" class="w-full h-full object-cover" />
                                                            </button>
                                                        )}
                                                    </For>
                                                </div>
                                            </Show>

                                            {/* Room Info */}
                                            <div>
                                                <h1
                                                    class="text-3xl md:text-4xl font-light text-[#1a1a2e] mb-2"
                                                    style={{ "font-family": "'Cormorant Garamond', serif" }}
                                                >
                                                    Habitación #{roomData.roomNumber} — {roomData.type}
                                                </h1>
                                                <p class="text-gray-500 text-sm" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                                    Piso {roomData.floor || "—"} • Hasta {roomData.capacity} persona(s)
                                                </p>
                                            </div>

                                            {/* Description */}
                                            <Show when={roomData.description}>
                                                <div>
                                                    <h3
                                                        class="text-xl font-semibold text-[#1a1a2e] mb-3"
                                                        style={{ "font-family": "'Cormorant Garamond', serif" }}
                                                    >
                                                        Descripción
                                                    </h3>
                                                    <p
                                                        class="text-gray-600 leading-relaxed"
                                                        style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}
                                                    >
                                                        {roomData.description}
                                                    </p>
                                                </div>
                                            </Show>

                                            {/* Amenities */}
                                            <Show when={roomData.amenities?.length > 0}>
                                                <div>
                                                    <h3
                                                        class="text-xl font-semibold text-[#1a1a2e] mb-4"
                                                        style={{ "font-family": "'Cormorant Garamond', serif" }}
                                                    >
                                                        Servicios incluidos
                                                    </h3>
                                                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        <For each={roomData.amenities}>
                                                            {(amenity) => (
                                                                <div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                                                                    <svg class="w-5 h-5 text-[#c9a84c] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                                                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    <span class="text-sm text-gray-700" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                                                        {amenity}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </For>
                                                    </div>
                                                </div>
                                            </Show>
                                        </div>

                                        {/* Right: Booking Sidebar */}
                                        <div class="lg:col-span-1">
                                            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-28" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                                {/* Price */}
                                                <div class="mb-6 pb-6 border-b border-gray-100">
                                                    <Show
                                                        when={seasonalInfo() && seasonalInfo().adjustedPrice !== seasonalInfo().basePrice}
                                                        fallback={
                                                            <p>
                                                                <span class="text-3xl font-semibold text-[#1a1a2e]" style={{ "font-family": "'Cormorant Garamond', serif" }}>
                                                                    {formatPrice(roomData.basePrice)}
                                                                </span>
                                                                <span class="text-sm text-gray-400"> /noche</span>
                                                            </p>
                                                        }
                                                    >
                                                        <p>
                                                            <span class="text-3xl font-semibold text-[#1a1a2e]" style={{ "font-family": "'Cormorant Garamond', serif" }}>
                                                                {formatPrice(seasonalInfo().adjustedPrice)}
                                                            </span>
                                                            <span class="text-sm text-gray-400"> /noche</span>
                                                        </p>
                                                        <div class="flex items-center gap-2 mt-1">
                                                            <span class="text-sm line-through text-gray-400">{formatPrice(seasonalInfo().basePrice)}</span>
                                                            <Show when={seasonalInfo().season}>
                                                                <span class="text-xs px-2 py-0.5 bg-[#c9a84c]/10 text-[#c9a84c] rounded-md font-medium">
                                                                    {seasonalInfo().season.name}
                                                                </span>
                                                            </Show>
                                                        </div>
                                                    </Show>
                                                </div>

                                                {/* Booking form */}
                                                <div class="space-y-4">
                                                    <div>
                                                        <label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Check-In</label>
                                                        <input
                                                            type="date"
                                                            class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c]"
                                                            min={todayStr()}
                                                            value={checkIn()}
                                                            onInput={(e) => { setCheckIn(e.target.value); setAvailability(null); setSeasonalInfo(null); }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Check-Out</label>
                                                        <input
                                                            type="date"
                                                            class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c]"
                                                            min={checkIn() || todayStr()}
                                                            value={checkOut()}
                                                            onInput={(e) => { setCheckOut(e.target.value); setAvailability(null); }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Huéspedes</label>
                                                        <select
                                                            class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c]"
                                                            value={guests()}
                                                            onChange={(e) => setGuests(parseInt(e.target.value))}
                                                        >
                                                            <For each={Array.from({ length: roomData.capacity }, (_, i) => i + 1)}>
                                                                {(n) => <option value={n}>{n} {n === 1 ? "persona" : "personas"}</option>}
                                                            </For>
                                                        </select>
                                                    </div>

                                                    {/* Check button */}
                                                    <button
                                                        onClick={checkAvailability}
                                                        disabled={checking() || !checkIn() || !checkOut()}
                                                        class="w-full py-3 bg-[#1a1a2e] hover:bg-[#2a2a4e] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 tracking-wide"
                                                    >
                                                        {checking() ? "Verificando..." : "Verificar Disponibilidad"}
                                                    </button>

                                                    {/* Availability result */}
                                                    <Show when={availability() !== null}>
                                                        <Show
                                                            when={availability()}
                                                            fallback={
                                                                <div class="p-4 bg-red-50 rounded-lg border border-red-100">
                                                                    <p class="text-sm text-red-700 font-medium">No disponible en esas fechas</p>
                                                                    <p class="text-xs text-red-500 mt-1">Intenta con otras fechas</p>
                                                                </div>
                                                            }
                                                        >
                                                            {/* Summary */}
                                                            <div class="p-4 bg-green-50 rounded-lg border border-green-100">
                                                                <p class="text-sm text-green-700 font-medium mb-3">Habitación disponible</p>
                                                                <div class="space-y-2 text-sm">
                                                                    <div class="flex justify-between text-gray-600">
                                                                        <span>{formatPrice(pricePerNight())} × {calculateNights()} noche(s)</span>
                                                                        <span class="font-medium text-gray-900">{formatPrice(pricePerNight() * calculateNights())}</span>
                                                                    </div>
                                                                    <div class="border-t border-green-200 pt-2 flex justify-between">
                                                                        <span class="font-semibold text-gray-900">Total</span>
                                                                        <span class="font-bold text-lg text-[#1a1a2e]" style={{ "font-family": "'Cormorant Garamond', serif" }}>
                                                                            {formatPrice(pricePerNight() * calculateNights())}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Book button */}
                                                            <button
                                                                onClick={handleBooking}
                                                                disabled={booking()}
                                                                class="w-full py-3.5 bg-[#c9a84c] hover:bg-[#b8963f] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 tracking-wide"
                                                            >
                                                                {booking()
                                                                    ? "Reservando..."
                                                                    : auth.isAuthenticated()
                                                                        ? "Reservar Ahora"
                                                                        : "Iniciar Sesión para Reservar"}
                                                            </button>
                                                        </Show>
                                                    </Show>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }}
                    </Show>
                </Show>
            </div>
        </PublicLayout>
    );
}

export default RoomDetail;