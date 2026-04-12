import { createSignal, onMount, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import PublicLayout from "../../components/public/PublicLayout";

const ROOM_TYPES = [
    {
        type: "Simple",
        description: "Perfecta para viajeros de negocios. Comodidad y funcionalidad en un espacio acogedor.",
        price: 50,
        image: "https://placehold.co/600x400/2a2a4e/c9a84c?text=Simple",
    },
    {
        type: "Doble",
        description: "Ideal para parejas. Amplitud y confort con una cama king size y vistas espectaculares.",
        price: 75,
        image: "https://placehold.co/600x400/2a2a4e/c9a84c?text=Doble",
    },
    {
        type: "Suite",
        description: "La experiencia premium. Sala de estar, minibar y todas las comodidades de lujo.",
        price: 100,
        image: "https://placehold.co/600x400/2a2a4e/c9a84c?text=Suite",
    },
    {
        type: "Deluxe",
        description: "Elegancia sin igual. Espacios amplios, decoración premium y servicio personalizado.",
        price: 120,
        image: "https://placehold.co/600x400/2a2a4e/c9a84c?text=Deluxe",
    },
];

const FEATURES = [
    {
        title: "Ubicación Privilegiada",
        description: "En el corazón de la ciudad, cerca de los principales atractivos turísticos y zonas comerciales.",
        icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
    },
    {
        title: "WiFi de Alta Velocidad",
        description: "Conexión gratuita en todas las áreas del hotel para que siempre estés conectado.",
        icon: "M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0",
    },
    {
        title: "Servicio 24/7",
        description: "Nuestro equipo está disponible las 24 horas del día para atender cualquier necesidad.",
        icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
        title: "Mejor Precio Garantizado",
        description: "Te garantizamos el mejor precio disponible. Si encuentras uno menor, lo igualamos.",
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    },
];

function Landing() {
    const navigate = useNavigate();

    // Search form
    const [checkIn, setCheckIn] = createSignal("");
    const [checkOut, setCheckOut] = createSignal("");
    const [guests, setGuests] = createSignal(2);
    const [roomType, setRoomType] = createSignal("");

    // Animations
    const [visible, setVisible] = createSignal(false);

    onMount(() => {
        setTimeout(() => setVisible(true), 100);
    });

    const todayStr = () => new Date().toISOString().split("T")[0];

    const handleSearch = (e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (checkIn()) params.set("checkIn", checkIn());
        if (checkOut()) params.set("checkOut", checkOut());
        if (guests()) params.set("guests", guests().toString());
        if (roomType()) params.set("type", roomType());
        navigate(`/search?${params.toString()}`);
    };

    const searchByType = (type) => {
        navigate(`/search?type=${type}`);
    };

    const formatPrice = (price) => `$${price.toFixed(2)}`;

    return (
        <PublicLayout transparent={true}>
            {/* ============================================ */}
            {/* HERO SECTION */}
            {/* ============================================ */}
            <section class="relative min-h-screen flex items-center justify-center overflow-hidden">
                {/* Background */}
                <div class="absolute inset-0">
                    <img
                        src="https://placehold.co/1920x1080/1a1a2e/c9a84c?text=Hotel+Reservations"
                        alt="Hotel"
                        class="w-full h-full object-cover"
                    />
                    <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
                </div>

                {/* Content */}
                <div class={`relative z-10 max-w-5xl mx-auto px-6 text-center transition-all duration-1000 ${visible() ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                    }`}>
                    <p
                        class="text-[#c9a84c] text-sm font-medium tracking-[0.3em] uppercase mb-4"
                        style={{ "font-family": "'Montserrat', sans-serif" }}
                    >
                        Bienvenido a
                    </p>
                    <h1
                        class="text-5xl md:text-7xl font-light text-white mb-6 leading-tight"
                        style={{ "font-family": "'Cormorant Garamond', serif" }}
                    >
                        Hotel Reservations
                    </h1>
                    <p
                        class="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-12"
                        style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}
                    >
                        Donde el lujo y la comodidad se encuentran. Descubre una experiencia
                        de hospedaje única en el corazón de San Salvador.
                    </p>

                    {/* Search Form */}
                    <form
                        onSubmit={handleSearch}
                        class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/20 max-w-4xl mx-auto"
                    >
                        <div
                            class="grid grid-cols-1 md:grid-cols-4 gap-4"
                            style={{ "font-family": "'Montserrat', sans-serif" }}
                        >
                            <div class="text-left">
                                <label class="block text-white/70 text-xs font-medium mb-2 uppercase tracking-wider">
                                    Check-In
                                </label>
                                <input
                                    type="date"
                                    class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#c9a84c] transition-colors"
                                    min={todayStr()}
                                    value={checkIn()}
                                    onInput={(e) => setCheckIn(e.target.value)}
                                />
                            </div>
                            <div class="text-left">
                                <label class="block text-white/70 text-xs font-medium mb-2 uppercase tracking-wider">
                                    Check-Out
                                </label>
                                <input
                                    type="date"
                                    class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#c9a84c] transition-colors"
                                    min={checkIn() || todayStr()}
                                    value={checkOut()}
                                    onInput={(e) => setCheckOut(e.target.value)}
                                />
                            </div>
                            <div class="text-left">
                                <label class="block text-white/70 text-xs font-medium mb-2 uppercase tracking-wider">
                                    Huéspedes
                                </label>
                                <select
                                    class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#c9a84c] transition-colors"
                                    value={guests()}
                                    onChange={(e) => setGuests(parseInt(e.target.value))}
                                >
                                    <For each={[1, 2, 3, 4, 5, 6]}>
                                        {(n) => (
                                            <option value={n} class="text-gray-900">
                                                {n} {n === 1 ? "persona" : "personas"}
                                            </option>
                                        )}
                                    </For>
                                </select>
                            </div>
                            <div class="text-left">
                                <label class="block text-white/70 text-xs font-medium mb-2 uppercase tracking-wider">
                                    Tipo
                                </label>
                                <select
                                    class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#c9a84c] transition-colors"
                                    value={roomType()}
                                    onChange={(e) => setRoomType(e.target.value)}
                                >
                                    <option value="" class="text-gray-900">Todas</option>
                                    <option value="Simple" class="text-gray-900">Simple</option>
                                    <option value="Doble" class="text-gray-900">Doble</option>
                                    <option value="Suite" class="text-gray-900">Suite</option>
                                    <option value="Deluxe" class="text-gray-900">Deluxe</option>
                                    <option value="Presidencial" class="text-gray-900">Presidencial</option>
                                </select>
                            </div>
                        </div>
                        <button
                            type="submit"
                            class="mt-6 w-full md:w-auto px-10 py-3.5 bg-[#c9a84c] hover:bg-[#b8963f] text-white font-medium rounded-lg transition-all tracking-wide text-sm"
                            style={{ "font-family": "'Montserrat', sans-serif" }}
                        >
                            Buscar Disponibilidad
                        </button>
                    </form>
                </div>

                {/* Scroll indicator */}
                <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                    <svg class="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </section>

            {/* ============================================ */}
            {/* NUESTRAS HABITACIONES */}
            {/* ============================================ */}
            <section class="py-24 bg-[#f8f9fa]">
                <div class="max-w-7xl mx-auto px-6 lg:px-8">
                    <div class="text-center mb-16">
                        <p
                            class="text-[#c9a84c] text-sm font-medium tracking-[0.3em] uppercase mb-3"
                            style={{ "font-family": "'Montserrat', sans-serif" }}
                        >
                            Nuestras Habitaciones
                        </p>
                        <h2
                            class="text-4xl md:text-5xl font-light text-[#1a1a2e]"
                            style={{ "font-family": "'Cormorant Garamond', serif" }}
                        >
                            Encuentra tu espacio ideal
                        </h2>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <For each={ROOM_TYPES}>
                            {(room) => (
                                <div
                                    class="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer"
                                    onClick={() => searchByType(room.type)}
                                >
                                    <div class="relative overflow-hidden h-56">
                                        <img
                                            src={room.image}
                                            alt={room.type}
                                            class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    </div>
                                    <div class="p-6">
                                        <h3
                                            class="text-xl font-semibold text-[#1a1a2e] mb-2"
                                            style={{ "font-family": "'Cormorant Garamond', serif" }}
                                        >
                                            {room.type}
                                        </h3>
                                        <p
                                            class="text-gray-500 text-sm mb-4 leading-relaxed"
                                            style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}
                                        >
                                            {room.description}
                                        </p>
                                        <div class="flex items-center justify-between">
                                            <p style={{ "font-family": "'Montserrat', sans-serif" }}>
                                                <span class="text-sm text-gray-400">desde </span>
                                                <span class="text-lg font-semibold text-[#1a1a2e]">{formatPrice(room.price)}</span>
                                                <span class="text-sm text-gray-400"> /noche</span>
                                            </p>
                                            <span
                                                class="text-xs font-medium text-[#c9a84c] group-hover:translate-x-1 transition-transform"
                                                style={{ "font-family": "'Montserrat', sans-serif" }}
                                            >
                                                Ver más →
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
            </section>

            {/* ============================================ */}
            {/* ¿POR QUÉ ELEGIRNOS? */}
            {/* ============================================ */}
            <section class="py-24 bg-white">
                <div class="max-w-7xl mx-auto px-6 lg:px-8">
                    <div class="text-center mb-16">
                        <p
                            class="text-[#c9a84c] text-sm font-medium tracking-[0.3em] uppercase mb-3"
                            style={{ "font-family": "'Montserrat', sans-serif" }}
                        >
                            ¿Por qué elegirnos?
                        </p>
                        <h2
                            class="text-4xl md:text-5xl font-light text-[#1a1a2e]"
                            style={{ "font-family": "'Cormorant Garamond', serif" }}
                        >
                            Una experiencia incomparable
                        </h2>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <For each={FEATURES}>
                            {(feature) => (
                                <div class="text-center group">
                                    <div class="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#1a1a2e] flex items-center justify-center group-hover:bg-[#c9a84c] transition-colors duration-500">
                                        <svg class="w-7 h-7 text-[#c9a84c] group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                            <path stroke-linecap="round" stroke-linejoin="round" d={feature.icon} />
                                        </svg>
                                    </div>
                                    <h3
                                        class="text-lg font-semibold text-[#1a1a2e] mb-3"
                                        style={{ "font-family": "'Cormorant Garamond', serif" }}
                                    >
                                        {feature.title}
                                    </h3>
                                    <p
                                        class="text-gray-500 text-sm leading-relaxed"
                                        style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}
                                    >
                                        {feature.description}
                                    </p>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
            </section>

            {/* ============================================ */}
            {/* SOBRE EL HOTEL */}
            {/* ============================================ */}
            <section class="py-24 bg-[#1a1a2e] text-white overflow-hidden">
                <div class="max-w-7xl mx-auto px-6 lg:px-8">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <p
                                class="text-[#c9a84c] text-sm font-medium tracking-[0.3em] uppercase mb-3"
                                style={{ "font-family": "'Montserrat', sans-serif" }}
                            >
                                Sobre Nosotros
                            </p>
                            <h2
                                class="text-4xl md:text-5xl font-light mb-8 leading-tight"
                                style={{ "font-family": "'Cormorant Garamond', serif" }}
                            >
                                Una tradición de
                                <br />
                                <span class="text-[#c9a84c]">excelencia</span>
                            </h2>
                            <p
                                class="text-white/60 leading-relaxed mb-6"
                                style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}
                            >
                                Con más de 20 años de experiencia, Hotel Reservations se ha consolidado como
                                uno de los destinos más exclusivos de San Salvador. Nuestro compromiso con
                                la calidad y el servicio personalizado nos distingue.
                            </p>
                            <p
                                class="text-white/60 leading-relaxed mb-10"
                                style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}
                            >
                                Cada detalle ha sido cuidadosamente pensado para ofrecerte una estancia
                                memorable, desde nuestras habitaciones de diseño hasta nuestra gastronomía
                                de primer nivel.
                            </p>

                            <div class="grid grid-cols-3 gap-8">
                                <div>
                                    <p class="text-3xl font-light text-[#c9a84c]" style={{ "font-family": "'Cormorant Garamond', serif" }}>50+</p>
                                    <p class="text-xs text-white/40 uppercase tracking-wider mt-1" style={{ "font-family": "'Montserrat', sans-serif" }}>Habitaciones</p>
                                </div>
                                <div>
                                    <p class="text-3xl font-light text-[#c9a84c]" style={{ "font-family": "'Cormorant Garamond', serif" }}>20+</p>
                                    <p class="text-xs text-white/40 uppercase tracking-wider mt-1" style={{ "font-family": "'Montserrat', sans-serif" }}>Años</p>
                                </div>
                                <div>
                                    <p class="text-3xl font-light text-[#c9a84c]" style={{ "font-family": "'Cormorant Garamond', serif" }}>98%</p>
                                    <p class="text-xs text-white/40 uppercase tracking-wider mt-1" style={{ "font-family": "'Montserrat', sans-serif" }}>Satisfacción</p>
                                </div>
                            </div>
                        </div>

                        <div class="relative">
                            <img
                                src="https://placehold.co/600x800/2a2a4e/c9a84c?text=Hotel"
                                alt="Hotel Interior"
                                class="rounded-2xl shadow-2xl w-full h-[500px] object-cover"
                            />
                            <div class="absolute -bottom-6 -left-6 w-32 h-32 rounded-xl bg-[#c9a84c] flex items-center justify-center">
                                <div class="text-center">
                                    <p class="text-2xl font-bold text-white" style={{ "font-family": "'Cormorant Garamond', serif" }}>4.9</p>
                                    <p class="text-[10px] text-white/80 uppercase tracking-wider" style={{ "font-family": "'Montserrat', sans-serif" }}>Rating</p>
                                    <div class="flex gap-0.5 justify-center mt-1">
                                        <For each={[1, 2, 3, 4, 5]}>{() => <span class="text-white text-xs">★</span>}</For>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section class="py-20 bg-[#f8f9fa]">
                <div class="max-w-3xl mx-auto px-6 text-center">
                    <h2
                        class="text-3xl md:text-4xl font-light text-[#1a1a2e] mb-6"
                        style={{ "font-family": "'Cormorant Garamond', serif" }}
                    >
                        ¿Listo para tu próxima estancia?
                    </h2>
                    <p
                        class="text-gray-500 mb-10"
                        style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}
                    >
                        Reserva ahora y aprovecha nuestras tarifas exclusivas.
                    </p>
                    <button
                        onClick={() => navigate("/search")}
                        class="px-10 py-4 bg-[#1a1a2e] hover:bg-[#2a2a4e] text-white rounded-lg transition-colors tracking-wide text-sm font-medium"
                        style={{ "font-family": "'Montserrat', sans-serif" }}
                    >
                        Explorar Habitaciones
                    </button>
                </div>
            </section>
        </PublicLayout>
    );
}

export default Landing;