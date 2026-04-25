import { A, useNavigate, useLocation } from "@solidjs/router";
import { useAuth } from "../../context/AuthContext";
import { createSignal, onMount, onCleanup, Show } from "solid-js";
import hotelLogo from "../../assets/hotel_icon.png";
import LoyaltyBadge from "./LoyaltyBadge";

const BACKEND_URL = "http://localhost:4000";

function PublicLayout(props) {
    const auth = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [scrolled, setScrolled] = createSignal(false);
    const [mobileMenu, setMobileMenu] = createSignal(false);
    const [userDropdown, setUserDropdown] = createSignal(false);

    // Scroll listener para cambiar navbar
    const handleScroll = () => {
        setScrolled(window.scrollY > 50);
    };

    // Cerrar dropdown al hacer click fuera
    const handleClickOutside = (e) => {
        if (userDropdown() && !e.target.closest('.user-dropdown-container')) {
            setUserDropdown(false);
        }
    };

    onMount(() => {
        window.addEventListener("scroll", handleScroll);
        document.addEventListener("click", handleClickOutside);

        // Forzar modo claro en páginas públicas
        document.documentElement.classList.remove("dark");

        if (auth.mustChangePassword?.() && location.pathname !== "/change-password") {
            navigate("/change-password");
        }
    });

    onCleanup(() => {
        window.removeEventListener("scroll", handleScroll);
        document.removeEventListener("click", handleClickOutside);

        // Restaurar preferencia de tema al salir
        const saved = localStorage.getItem("theme");
        if (saved === "dark") {
            document.documentElement.classList.add("dark");
        }
    });

    const handleLogout = async () => {
        await auth.logout();
        setUserDropdown(false);
        navigate("/");
    };

    // Determinar si la página actual es la landing (para navbar transparente)
    const isLanding = () => props.transparent !== false;

    return (
        <div class="min-h-screen flex flex-col" style={{ "font-family": "'Cormorant Garamond', Georgia, serif" }}>
            {/* Google Font */}
            <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

            {/* NAVBAR */}
            <nav
                class={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled() || !isLanding()
                    ? "bg-white/95 dark:bg-[#0a0a14]/95 backdrop-blur-md shadow-sm"
                    : "bg-transparent"
                    }`}
            >
                <div class="max-w-7xl mx-auto px-6 lg:px-8">
                    <div class="flex items-center justify-between h-20">
                        {/* Logo */}
                        <A href="/" class="flex items-center gap-3 group">
                            <div class={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${scrolled() || !isLanding()
                                ? "bg-[#1a1a2e]"
                                : "bg-white/20 backdrop-blur-sm"
                                }`}>
                                <img src={hotelLogo} alt="Logo" class="w-6 h-6 object-contain" />
                            </div>
                            <div>
                                <p class={`text-lg font-semibold tracking-wide transition-colors ${scrolled() || !isLanding() ? "text-[#1a1a2e] dark:text-white" : "text-white"
                                    }`} style={{ "font-family": "'Cormorant Garamond', serif" }}>
                                    Hotel Reservations
                                </p>
                            </div>
                        </A>

                        {/* Links desktop */}
                        <div class="hidden md:flex items-center gap-8" style={{ "font-family": "'Montserrat', sans-serif" }}>
                            <A
                                href="/"
                                class={`text-sm font-medium tracking-wide transition-colors hover:opacity-80 ${scrolled() || !isLanding() ? "text-gray-700 dark:text-gray-300" : "text-white/90"
                                    }`}
                            >
                                Inicio
                            </A>
                            <A
                                href="/search"
                                class={`text-sm font-medium tracking-wide transition-colors hover:opacity-80 ${scrolled() || !isLanding() ? "text-gray-700 dark:text-gray-300" : "text-white/90"
                                    }`}
                            >
                                Habitaciones
                            </A>

                            <Show when={auth.isAuthenticated()}>
                                <A
                                    href="/my-reservations"
                                    class={`text-sm font-medium tracking-wide transition-colors hover:opacity-80 ${scrolled() || !isLanding() ? "text-gray-700 dark:text-gray-300" : "text-white/90"
                                        }`}
                                >
                                    Mis Reservas
                                </A>
                            </Show>

                            {/* Auth buttons */}
                            <Show
                                when={auth.isAuthenticated()}
                                fallback={
                                    <div class="flex items-center gap-3">
                                        <A
                                            href="/client-login"
                                            class={`text-sm font-medium tracking-wide transition-colors ${scrolled() || !isLanding() ? "text-gray-700 dark:text-gray-300" : "text-white/90"
                                                }`}
                                        >
                                            Iniciar Sesión
                                        </A>
                                        <A
                                            href="/client-register"
                                            class="text-sm font-medium px-5 py-2.5 rounded-lg bg-[#c9a84c] text-white hover:bg-[#b8963f] transition-colors tracking-wide"
                                        >
                                            Registrarse
                                        </A>
                                    </div>
                                }
                            >
                                {/* User dropdown */}
                                <div class="relative user-dropdown-container">
                                    <button
                                        onClick={() => setUserDropdown(!userDropdown())}
                                        class={`flex items-center gap-2 text-sm font-medium transition-colors ${scrolled() || !isLanding() ? "text-gray-700 dark:text-gray-300" : "text-white/90"
                                            }`}
                                    >
                                        <div class="w-8 h-8 rounded-full bg-[#1a1a2e] dark:bg-white/20 flex items-center justify-center">
                                            <span class="text-white text-xs font-semibold">
                                                {auth.user()?.name?.charAt(0).toUpperCase()}
                                            </span>
                                            <LoyaltyBadge />
                                        </div>
                                        <span>{auth.user()?.name}</span>
                                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <Show when={userDropdown()}>
                                        <div
                                            class="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl py-2"
                                            style={{ "font-family": "'Montserrat', sans-serif" }}
                                        >
                                            <A
                                                href="/my-reservations"
                                                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                onClick={() => setUserDropdown(false)}
                                            >
                                                Mis Reservas
                                            </A>
                                            <hr class="my-1 border-gray-200 dark:border-gray-800" />
                                            <button
                                                onClick={handleLogout}
                                                class="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            >
                                                Cerrar Sesión
                                            </button>
                                        </div>
                                    </Show>
                                </div>
                            </Show>
                        </div>

                        {/* Mobile menu button */}
                        <button
                            class="md:hidden"
                            onClick={() => setMobileMenu(!mobileMenu())}
                        >
                            <svg class={`w-6 h-6 ${scrolled() || !isLanding() ? "text-gray-900 dark:text-white" : "text-white"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={mobileMenu() ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                            </svg>
                        </button>
                    </div>

                    {/* Mobile menu */}
                    <Show when={mobileMenu()}>
                        <div class="md:hidden pb-6 space-y-3 border-t border-gray-200/20" style={{ "font-family": "'Montserrat', sans-serif" }}>
                            <A href="/" class="block py-2 text-sm text-gray-700 dark:text-gray-300" onClick={() => setMobileMenu(false)}>Inicio</A>
                            <A href="/search" class="block py-2 text-sm text-gray-700 dark:text-gray-300" onClick={() => setMobileMenu(false)}>Habitaciones</A>
                            <Show when={auth.isAuthenticated()}>
                                <A href="/reservations" class="block py-2 text-sm text-gray-700 dark:text-gray-300" onClick={() => setMobileMenu(false)}>Mis Reservas</A>
                                <button onClick={handleLogout} class="block py-2 text-sm text-red-600">Cerrar Sesión</button>
                            </Show>
                            <Show when={!auth.isAuthenticated()}>
                                <A href="/login" class="block py-2 text-sm text-gray-700 dark:text-gray-300" onClick={() => setMobileMenu(false)}>Iniciar Sesión</A>
                                <A href="/register" class="block py-2 text-sm font-medium text-[#c9a84c]" onClick={() => setMobileMenu(false)}>Registrarse</A>
                            </Show>
                        </div>
                    </Show>
                </div>
            </nav>

            {/* MAIN CONTENT */}
            <main class="flex-1">
                {props.children}
            </main>

            {/* FOOTER */}
            <footer class="bg-[#1a1a2e] text-white">
                <div class="max-w-7xl mx-auto px-6 lg:px-8 py-16">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-12">
                        {/* Logo y descripción */}
                        <div class="md:col-span-2">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-10 h-10 rounded-lg bg-[#c9a84c] flex items-center justify-center">
                                    <img src={hotelLogo} alt="Logo" class="w-6 h-6 object-contain" />
                                </div>
                                <p class="text-xl font-semibold tracking-wide" style={{ "font-family": "'Cormorant Garamond', serif" }}>
                                    Hotel Reservations
                                </p>
                            </div>
                            <p class="text-gray-400 text-sm leading-relaxed max-w-md" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                Descubre el lujo y la comodidad en cada estancia. Nuestro hotel ofrece una experiencia
                                incomparable con habitaciones de primera clase y un servicio excepcional.
                            </p>
                        </div>

                        {/* Links rápidos */}
                        <div style={{ "font-family": "'Montserrat', sans-serif" }}>
                            <p class="text-sm font-semibold uppercase tracking-wider text-[#c9a84c] mb-4">
                                Enlaces
                            </p>
                            <div class="space-y-3">
                                <A href="/" class="block text-sm text-gray-400 hover:text-white transition-colors">Inicio</A>
                                <A href="/search" class="block text-sm text-gray-400 hover:text-white transition-colors">Habitaciones</A>
                                <A href="/search?type=Suite" class="block text-sm text-gray-400 hover:text-white transition-colors">Suites</A>
                                <A href="/login" class="block text-sm text-gray-400 hover:text-white transition-colors">Reservar</A>
                            </div>
                        </div>

                        {/* Contacto */}
                        <div style={{ "font-family": "'Montserrat', sans-serif" }}>
                            <p class="text-sm font-semibold uppercase tracking-wider text-[#c9a84c] mb-4">
                                Contacto
                            </p>
                            <div class="space-y-3 text-sm text-gray-400">
                                <p class="flex items-center gap-2">
                                    <svg class="w-4 h-4 text-[#c9a84c]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    Playa El Cuco, San Miguel, San Salvador
                                </p>
                                <p class="flex items-center gap-2">
                                    <svg class="w-4 h-4 text-[#c9a84c]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    +503 2222-3333
                                </p>
                                <p class="flex items-center gap-2">
                                    <svg class="w-4 h-4 text-[#c9a84c]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    info@hotelreservations.com
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Divider + Copyright */}
                    <div class="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{ "font-family": "'Montserrat', sans-serif" }}>
                        <p class="text-xs text-gray-500">
                            © {new Date().getFullYear()} Hotel Reservations. Todos los derechos reservados.
                        </p>
                        <div class="flex items-center gap-4">
                            <a href="#" class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#c9a84c] transition-colors">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                            </a>
                            <a href="#" class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#c9a84c] transition-colors">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                            </a>
                            <a href="#" class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#c9a84c] transition-colors">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" /></svg>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default PublicLayout;