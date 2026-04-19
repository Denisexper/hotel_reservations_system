import { createSignal, createResource, Show, For, onMount } from "solid-js";
import { api } from "../services/api";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "@solidjs/router";
import { showToast } from "../utils/toast";
import Pagination from "../components/Pagination";

const SERVICE_ICONS = {
    piscina: "🏊",
    gimnasio: "🏋️",
    spa: "🧖",
    restaurante: "🍽️",
    bar: "🍸",
    playa: "🏖️",
    todas: "⭐",
};

const ALL_SERVICES = [
    { value: "todas", label: "Todas las instalaciones" },
    { value: "piscina", label: "Piscina" },
    { value: "gimnasio", label: "Gimnasio" },
    { value: "spa", label: "Spa" },
    { value: "restaurante", label: "Restaurante" },
    { value: "bar", label: "Bar" },
    { value: "playa", label: "Playa" },
];

const PAYMENT_METHODS = [
    { value: "", label: "Sin pagar" },
    { value: "efectivo", label: "Efectivo" },
    { value: "tarjeta", label: "Tarjeta" },
    { value: "transferencia", label: "Transferencia" },
];

function DayPass() {
    const auth = useAuth();
    const navigate = useNavigate();

    if (!auth.hasPermission("daypass.read")) {
        navigate("/dashboard");
        return null;
    }

    // Paginación y filtros
    const [currentPage, setCurrentPage] = createSignal(1);
    const [limit] = createSignal(10);
    const [statusFilter, setStatusFilter] = createSignal("");
    const [paymentFilter, setPaymentFilter] = createSignal("");
    const [dateFilter, setDateFilter] = createSignal("");
    const [appliedFilters, setAppliedFilters] = createSignal({});

    // Resources
    const [dayPasses, { refetch }] = createResource(
        () => ({ ...appliedFilters(), page: currentPage(), limit: limit() }),
        (params) => {
            const filters = { page: params.page, limit: params.limit };
            if (params.status) filters.status = params.status;
            if (params.paymentStatus) filters.paymentStatus = params.paymentStatus;
            if (params.date) filters.date = params.date;
            return api.getDayPasses(filters);
        },
    );

    const [todayData, { refetch: refetchToday }] = createResource(() => api.getDayPassToday());

    const applyFilters = () => {
        setAppliedFilters({
            status: statusFilter(),
            paymentStatus: paymentFilter(),
            date: dateFilter(),
        });
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setStatusFilter("");
        setPaymentFilter("");
        setDateFilter("");
        setAppliedFilters({});
        setCurrentPage(1);
    };

    const refetchAll = () => {
        refetch();
        refetchToday();
    };

    // ============================================
    // MODAL: Crear Day Pass
    // ============================================
    const [showCreate, setShowCreate] = createSignal(false);
    const [createLoading, setCreateLoading] = createSignal(false);
    const [formName, setFormName] = createSignal("");
    const [formEmail, setFormEmail] = createSignal("");
    const [formPhone, setFormPhone] = createSignal("");
    const [formDate, setFormDate] = createSignal(new Date().toISOString().split("T")[0]);
    const [formGuests, setFormGuests] = createSignal(1);
    const [formServices, setFormServices] = createSignal(["todas"]);
    const [formPrice, setFormPrice] = createSignal(15);
    const [formPayment, setFormPayment] = createSignal("");
    const [formNotes, setFormNotes] = createSignal("");
    const [createError, setCreateError] = createSignal("");

    const openCreate = () => {
        setFormName("");
        setFormEmail("");
        setFormPhone("");
        setFormDate(new Date().toISOString().split("T")[0]);
        setFormGuests(1);
        setFormServices(["todas"]);
        setFormPrice(15);
        setFormPayment("");
        setFormNotes("");
        setCreateError("");
        setShowCreate(true);
    };

    const toggleService = (service) => {
        if (service === "todas") {
            setFormServices(["todas"]);
            return;
        }
        let current = formServices().filter((s) => s !== "todas");
        if (current.includes(service)) {
            current = current.filter((s) => s !== service);
        } else {
            current.push(service);
        }
        if (current.length === 0) current = ["todas"];
        setFormServices(current);
    };

    const formTotal = () => formGuests() * formPrice();

    const submitCreate = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateError("");
        try {
            const data = {
                visitorName: formName(),
                visitorEmail: formEmail() || undefined,
                visitorPhone: formPhone() || undefined,
                date: formDate(),
                numberOfGuests: Number(formGuests()),
                services: formServices(),
                pricePerPerson: Number(formPrice()),
                notes: formNotes() || undefined,
            };
            if (formPayment()) data.paymentMethod = formPayment();
            await api.createDayPass(data);
            showToast.success("Day Pass creado exitosamente");
            setShowCreate(false);
            refetchAll();
        } catch (error) {
            setCreateError(error.message);
            showToast.error(error.message);
        }
        setCreateLoading(false);
    };

    // ============================================
    // MODAL: Detalle
    // ============================================
    const [showDetail, setShowDetail] = createSignal(false);
    const [detailData, setDetailData] = createSignal(null);
    const [detailLoading, setDetailLoading] = createSignal(false);

    const openDetail = async (dp) => {
        setDetailLoading(true);
        setShowDetail(true);
        try {
            const result = await api.getDayPass(dp._id);
            setDetailData(result.data);
        } catch (error) {
            showToast.error(error.message);
            setShowDetail(false);
        }
        setDetailLoading(false);
    };

    // ============================================
    // MODAL: Pago
    // ============================================
    const [showPay, setShowPay] = createSignal(false);
    const [payDp, setPayDp] = createSignal(null);
    const [payMethod, setPayMethod] = createSignal("efectivo");
    const [payLoading, setPayLoading] = createSignal(false);

    const openPay = (dp) => {
        setPayDp(dp);
        setPayMethod("efectivo");
        setShowPay(true);
    };

    const submitPay = async () => {
        setPayLoading(true);
        try {
            await api.payDayPass(payDp()._id, { paymentMethod: payMethod() });
            showToast.success("Pago registrado exitosamente");
            setShowPay(false);
            refetchAll();
        } catch (error) {
            showToast.error(error.message);
        }
        setPayLoading(false);
    };

    // ============================================
    // Check-out
    // ============================================
    const handleCheckout = (dp) => {
        showToast.confirm(
            `¿Registrar salida de ${dp.visitorName}?`,
            async () => {
                try {
                    await api.checkoutDayPass(dp._id);
                    showToast.success("Check-out registrado");
                    refetchAll();
                } catch (error) {
                    showToast.error(error.message);
                }
            },
        );
    };

    // ============================================
    // MODAL: Cancelar
    // ============================================
    const [showCancel, setShowCancel] = createSignal(false);
    const [cancelDp, setCancelDp] = createSignal(null);
    const [cancelReason, setCancelReason] = createSignal("");
    const [cancelLoading, setCancelLoading] = createSignal(false);

    const openCancel = (dp) => {
        setCancelDp(dp);
        setCancelReason("");
        setShowCancel(true);
    };

    const submitCancel = async () => {
        setCancelLoading(true);
        try {
            const result = await api.cancelDayPass(cancelDp()._id, cancelReason());
            showToast.success(result.msj);
            if (result.refund) showToast.info(result.refund);
            setShowCancel(false);
            refetchAll();
        } catch (error) {
            showToast.error(error.message);
        }
        setCancelLoading(false);
    };

    // ============================================
    // HELPERS
    // ============================================
    const formatPrice = (price) =>
        new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(price || 0);

    const formatDate = (date) => {
        if (!date) return "—";
        const d = typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)
            ? new Date(date + "T12:00:00")
            : new Date(date);
        return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    };

    const formatTime = (date) => {
        if (!date) return "—";
        return new Date(date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    };

    const paymentStatusColor = (status) => {
        const colors = {
            pagado: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
            pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
            reembolsado: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        };
        return colors[status] || colors.pendiente;
    };

    const statusColor = (status) => {
        const colors = {
            activo: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
            vencido: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
            cancelado: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
        };
        return colors[status] || colors.activo;
    };

    const statusLabel = (s) => {
        const labels = { activo: "Activo", vencido: "Vencido", cancelado: "Cancelado" };
        return labels[s] || s;
    };

    const paymentLabel = (s) => {
        const labels = { pagado: "Pagado", pendiente: "Pendiente", reembolsado: "Reembolsado" };
        return labels[s] || s;
    };

    return (
        <ProtectedRoute>
            <Layout>
                <div class="p-8 max-w-7xl mx-auto">
                    {/* Header */}
                    <div class="flex justify-between items-center mb-8">
                        <div>
                            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Day Pass</h1>
                            <p class="text-gray-500 dark:text-gray-400 mt-1">Gestión de pases de día para visitantes</p>
                        </div>
                        <Show when={auth.hasPermission("daypass.create")}>
                            <button onClick={openCreate} class="btn-primary">+ Nuevo Day Pass</button>
                        </Show>
                    </div>

                    {/* Resumen del día */}
                    <Show when={todayData()?.data?.summary}>
                        <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                            <div class="card">
                                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Day Passes Hoy</p>
                                <p class="text-2xl font-bold text-gray-900 dark:text-white">{todayData().data.summary.total}</p>
                            </div>
                            <div class="card">
                                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Visitantes</p>
                                <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{todayData().data.summary.totalGuests}</p>
                            </div>
                            <div class="card">
                                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Ingresos Hoy</p>
                                <p class="text-2xl font-bold text-green-600 dark:text-green-400">{formatPrice(todayData().data.summary.totalRevenue)}</p>
                            </div>
                            <div class="card">
                                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Pagados</p>
                                <p class="text-2xl font-bold text-green-600 dark:text-green-400">{todayData().data.summary.paid}</p>
                            </div>
                            <div class="card">
                                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Pendientes</p>
                                <p class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{todayData().data.summary.pending}</p>
                            </div>
                        </div>
                    </Show>

                    {/* Filtros */}
                    <div class="card mb-6">
                        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Filtros</p>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <select class="input-field" value={statusFilter()} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="">Todos los estados</option>
                                <option value="activo">Activo</option>
                                <option value="vencido">Vencido</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                            <select class="input-field" value={paymentFilter()} onChange={(e) => setPaymentFilter(e.target.value)}>
                                <option value="">Todos los pagos</option>
                                <option value="pagado">Pagado</option>
                                <option value="pendiente">Pendiente</option>
                                <option value="reembolsado">Reembolsado</option>
                            </select>
                            <input
                                type="date" class="input-field" value={dateFilter()}
                                onInput={(e) => setDateFilter(e.target.value)}
                                placeholder="Fecha específica"
                            />
                            <div class="flex gap-3">
                                <button onClick={applyFilters} class="btn-primary">🔍 Buscar</button>
                                <button onClick={clearFilters} class="btn-secondary">✕ Limpiar</button>
                            </div>
                        </div>
                    </div>

                    {/* Tabla */}
                    <div class="card overflow-hidden p-0">
                        <Show when={dayPasses.loading}>
                            <div class="p-8 text-center text-gray-500 dark:text-gray-400">Cargando day passes...</div>
                        </Show>
                        <Show when={dayPasses.error}>
                            <div class="p-8 text-center text-red-500">Error al cargar day passes</div>
                        </Show>
                        <Show when={dayPasses()}>
                            <Show
                                when={dayPasses()?.data?.length > 0}
                                fallback={<div class="p-8 text-center text-gray-500 dark:text-gray-400">No se encontraron day passes</div>}
                            >
                                <div class="overflow-x-auto">
                                    <table class="w-full">
                                        <thead>
                                            <tr class="border-b border-gray-200 dark:border-gray-800">
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Código</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Visitante</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Personas</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Servicios</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pago</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                                <th class="px-6 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <For each={dayPasses()?.data}>
                                                {(dp) => (
                                                    <tr class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                                        <td class="px-6 py-4">
                                                            <p class="text-sm font-mono text-gray-900 dark:text-white">{dp.code}</p>
                                                        </td>
                                                        <td class="px-6 py-4">
                                                            <p class="text-sm font-medium text-gray-900 dark:text-white">{dp.visitorName}</p>
                                                            <Show when={dp.visitorEmail}>
                                                                <p class="text-xs text-gray-500 dark:text-gray-400">{dp.visitorEmail}</p>
                                                            </Show>
                                                        </td>
                                                        <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{formatDate(dp.date)}</td>
                                                        <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{dp.numberOfGuests}</td>
                                                        <td class="px-6 py-4">
                                                            <div class="flex flex-wrap gap-1">
                                                                <For each={dp.services?.slice(0, 3)}>
                                                                    {(s) => (
                                                                        <span class="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded" title={s}>
                                                                            {SERVICE_ICONS[s] || "📋"} {s === "todas" ? "Todas" : ""}
                                                                        </span>
                                                                    )}
                                                                </For>
                                                                <Show when={dp.services?.length > 3}>
                                                                    <span class="text-xs text-gray-400">+{dp.services.length - 3}</span>
                                                                </Show>
                                                            </div>
                                                        </td>
                                                        <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{formatPrice(dp.totalAmount)}</td>
                                                        <td class="px-6 py-4">
                                                            <span class={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatusColor(dp.paymentStatus)}`}>
                                                                {paymentLabel(dp.paymentStatus)}
                                                            </span>
                                                        </td>
                                                        <td class="px-6 py-4">
                                                            <span class={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(dp.status)}`}>
                                                                {statusLabel(dp.status)}
                                                            </span>
                                                        </td>
                                                        <td class="px-6 py-4">
                                                            <div class="flex items-center gap-2 justify-end">
                                                                <button
                                                                    onClick={() => openDetail(dp)}
                                                                    class="text-xs px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                                                                >
                                                                    Detalle
                                                                </button>
                                                                <Show when={dp.paymentStatus === "pendiente" && dp.status === "activo" && auth.hasPermission("daypass.update")}>
                                                                    <button
                                                                        onClick={() => openPay(dp)}
                                                                        class="text-xs px-3 py-1.5 rounded-md border border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                                                                    >
                                                                        Pagar
                                                                    </button>
                                                                </Show>
                                                                <Show when={dp.status === "activo" && auth.hasPermission("daypass.update")}>
                                                                    <button
                                                                        onClick={() => handleCheckout(dp)}
                                                                        class="text-xs px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                                                    >
                                                                        Check-out
                                                                    </button>
                                                                </Show>
                                                                <Show when={dp.status === "activo" && auth.hasPermission("daypass.update")}>
                                                                    <button
                                                                        onClick={() => openCancel(dp)}
                                                                        class="text-xs px-3 py-1.5 rounded-md border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </Show>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </For>
                                        </tbody>
                                    </table>
                                </div>
                                <Show when={dayPasses()?.pagination?.totalPages > 1}>
                                    <Pagination
                                        currentPage={currentPage()}
                                        totalPages={dayPasses().pagination.totalPages}
                                        onPageChange={(p) => setCurrentPage(p)}
                                    />
                                </Show>
                            </Show>
                        </Show>
                    </div>
                </div>

                {/* ============================================ */}
                {/* MODAL: CREAR DAY PASS */}
                {/* ============================================ */}
                <Show when={showCreate()}>
                    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
                            <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Nuevo Day Pass</h2>
                                <button onClick={() => setShowCreate(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                            </div>
                            <form onSubmit={submitCreate} class="flex-1 overflow-y-auto p-6 space-y-4">
                                {/* Nombre */}
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del visitante *</label>
                                    <input type="text" required class="input-field w-full" placeholder="Nombre completo" value={formName()} onInput={(e) => setFormName(e.target.value)} />
                                </div>
                                {/* Email y Teléfono */}
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email (opcional)</label>
                                        <input type="email" class="input-field w-full" placeholder="email@ejemplo.com" value={formEmail()} onInput={(e) => setFormEmail(e.target.value)} />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono (opcional)</label>
                                        <input type="text" class="input-field w-full" placeholder="+503 7777-8888" value={formPhone()} onInput={(e) => setFormPhone(e.target.value)} />
                                    </div>
                                </div>
                                {/* Fecha y Personas */}
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                                        <input type="date" required class="input-field w-full" value={formDate()} onInput={(e) => setFormDate(e.target.value)} />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Personas</label>
                                        <input type="number" required min="1" class="input-field w-full" value={formGuests()} onInput={(e) => setFormGuests(parseInt(e.target.value) || 1)} />
                                    </div>
                                </div>
                                {/* Servicios */}
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Servicios incluidos</label>
                                    <div class="flex flex-wrap gap-2">
                                        <For each={ALL_SERVICES}>
                                            {(service) => (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleService(service.value)}
                                                    class={`text-xs px-3 py-1.5 rounded-full border transition-colors ${formServices().includes(service.value)
                                                            ? "bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-400"
                                                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                                                        }`}
                                                >
                                                    {SERVICE_ICONS[service.value]} {service.label}
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                </div>
                                {/* Precio y Método de pago */}
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio por persona ($)</label>
                                        <input type="number" required min="0" step="0.01" class="input-field w-full" value={formPrice()} onInput={(e) => setFormPrice(parseFloat(e.target.value) || 0)} />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de pago</label>
                                        <select class="input-field w-full" value={formPayment()} onChange={(e) => setFormPayment(e.target.value)}>
                                            <For each={PAYMENT_METHODS}>{(m) => <option value={m.value}>{m.label}</option>}</For>
                                        </select>
                                    </div>
                                </div>
                                {/* Total calculado */}
                                <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                                    <div class="flex justify-between items-center">
                                        <span class="text-sm text-gray-600 dark:text-gray-400">{formGuests()} persona(s) × {formatPrice(formPrice())}</span>
                                        <span class="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(formTotal())}</span>
                                    </div>
                                    <Show when={formPayment()}>
                                        <p class="text-xs text-green-600 dark:text-green-400 mt-1">Se marcará como pagado al crear</p>
                                    </Show>
                                </div>
                                {/* Notas */}
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas (opcional)</label>
                                    <textarea class="input-field w-full" rows="2" maxlength="500" placeholder="Notas adicionales..." value={formNotes()} onInput={(e) => setFormNotes(e.target.value)} />
                                </div>
                                {/* Error */}
                                <Show when={createError()}>
                                    <div class="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">{createError()}</div>
                                </Show>
                                {/* Botones */}
                                <div class="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowCreate(false)} class="btn-secondary flex-1">Cancelar</button>
                                    <button type="submit" disabled={createLoading()} class="btn-primary flex-1 disabled:opacity-50">
                                        {createLoading() ? "Creando..." : "Crear Day Pass"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </Show>

                {/* ============================================ */}
                {/* MODAL: DETALLE */}
                {/* ============================================ */}
                <Show when={showDetail()}>
                    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
                            <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Detalle del Day Pass</h2>
                                <button onClick={() => setShowDetail(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                            </div>
                            <div class="flex-1 overflow-y-auto p-6">
                                <Show when={!detailLoading()} fallback={<div class="text-center py-8 text-gray-500 dark:text-gray-400">Cargando...</div>}>
                                    <Show when={detailData()}>
                                        {(d) => {
                                            const dp = d();
                                            return (
                                                <div class="space-y-6">
                                                    {/* Header */}
                                                    <div class="flex items-center justify-between">
                                                        <p class="text-sm font-mono text-gray-500 dark:text-gray-400">{dp.code}</p>
                                                        <div class="flex gap-2">
                                                            <span class={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatusColor(dp.paymentStatus)}`}>{paymentLabel(dp.paymentStatus)}</span>
                                                            <span class={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(dp.status)}`}>{statusLabel(dp.status)}</span>
                                                        </div>
                                                    </div>
                                                    {/* Visitante */}
                                                    <div class="card">
                                                        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Visitante</p>
                                                        <p class="text-sm font-medium text-gray-900 dark:text-white">{dp.visitorName}</p>
                                                        <Show when={dp.visitorEmail}><p class="text-sm text-gray-500 dark:text-gray-400">{dp.visitorEmail}</p></Show>
                                                        <Show when={dp.visitorPhone}><p class="text-sm text-gray-500 dark:text-gray-400">{dp.visitorPhone}</p></Show>
                                                    </div>
                                                    {/* Info */}
                                                    <div class="grid grid-cols-2 gap-4">
                                                        <div class="card">
                                                            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Fecha</p>
                                                            <p class="text-sm text-gray-900 dark:text-white">{formatDate(dp.date)}</p>
                                                        </div>
                                                        <div class="card">
                                                            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Personas</p>
                                                            <p class="text-sm text-gray-900 dark:text-white">{dp.numberOfGuests}</p>
                                                        </div>
                                                    </div>
                                                    {/* Servicios */}
                                                    <div class="card">
                                                        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Servicios</p>
                                                        <div class="flex flex-wrap gap-2">
                                                            <For each={dp.services}>
                                                                {(s) => (
                                                                    <span class="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-full">
                                                                        {SERVICE_ICONS[s]} {s}
                                                                    </span>
                                                                )}
                                                            </For>
                                                        </div>
                                                    </div>
                                                    {/* Precio */}
                                                    <div class="card">
                                                        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Precio</p>
                                                        <div class="flex justify-between text-sm">
                                                            <span class="text-gray-600 dark:text-gray-400">{dp.numberOfGuests} × {formatPrice(dp.pricePerPerson)}</span>
                                                            <span class="font-bold text-gray-900 dark:text-white">{formatPrice(dp.totalAmount)}</span>
                                                        </div>
                                                        <Show when={dp.paymentMethod}>
                                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Método: {dp.paymentMethod}</p>
                                                        </Show>
                                                    </div>
                                                    {/* Horarios */}
                                                    <div class="grid grid-cols-2 gap-4">
                                                        <div class="card">
                                                            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Entrada</p>
                                                            <p class="text-sm text-gray-900 dark:text-white">{formatTime(dp.checkInTime)}</p>
                                                        </div>
                                                        <div class="card">
                                                            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Salida</p>
                                                            <p class="text-sm text-gray-900 dark:text-white">{formatTime(dp.checkOutTime)}</p>
                                                        </div>
                                                    </div>
                                                    {/* Notas */}
                                                    <Show when={dp.notes}>
                                                        <div class="card">
                                                            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Notas</p>
                                                            <p class="text-sm text-gray-900 dark:text-white">{dp.notes}</p>
                                                        </div>
                                                    </Show>
                                                    {/* Registrado por */}
                                                    <div class="card">
                                                        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Registrado por</p>
                                                        <p class="text-sm text-gray-900 dark:text-white">{dp.createdBy?.name}</p>
                                                        <p class="text-xs text-gray-500 dark:text-gray-400">{dp.createdBy?.email}</p>
                                                    </div>
                                                    {/* Acciones */}
                                                    <div class="flex gap-2 flex-wrap pt-2">
                                                        <Show when={dp.paymentStatus === "pendiente" && dp.status === "activo" && auth.hasPermission("daypass.update")}>
                                                            <button onClick={() => { setShowDetail(false); openPay(dp); }} class="btn-primary">Registrar Pago</button>
                                                        </Show>
                                                        <Show when={dp.status === "activo" && auth.hasPermission("daypass.update")}>
                                                            <button onClick={() => { setShowDetail(false); handleCheckout(dp); }} class="btn-secondary">Check-out</button>
                                                        </Show>
                                                        <Show when={dp.status === "activo" && auth.hasPermission("daypass.update")}>
                                                            <button onClick={() => { setShowDetail(false); openCancel(dp); }} class="btn-secondary text-red-600 dark:text-red-400">Cancelar</button>
                                                        </Show>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    </Show>
                                </Show>
                            </div>
                            <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                                <button onClick={() => setShowDetail(false)} class="btn-secondary w-full">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </Show>

                {/* ============================================ */}
                {/* MODAL: PAGO */}
                {/* ============================================ */}
                <Show when={showPay()}>
                    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-md shadow-xl">
                            <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Registrar Pago</h2>
                                <button onClick={() => setShowPay(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                            </div>
                            <div class="p-6 space-y-4">
                                <div class="card text-center">
                                    <p class="text-sm text-gray-500 dark:text-gray-400">{payDp()?.visitorName}</p>
                                    <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatPrice(payDp()?.totalAmount)}</p>
                                    <p class="text-xs text-gray-400 mt-1">{payDp()?.code}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de pago</label>
                                    <select class="input-field w-full" value={payMethod()} onChange={(e) => setPayMethod(e.target.value)}>
                                        <option value="efectivo">Efectivo</option>
                                        <option value="tarjeta">Tarjeta</option>
                                        <option value="transferencia">Transferencia</option>
                                    </select>
                                </div>
                                <div class="flex gap-3 pt-2">
                                    <button onClick={() => setShowPay(false)} class="btn-secondary flex-1">Cancelar</button>
                                    <button onClick={submitPay} disabled={payLoading()} class="btn-primary flex-1 disabled:opacity-50">
                                        {payLoading() ? "Procesando..." : "Confirmar Pago"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Show>

                {/* ============================================ */}
                {/* MODAL: CANCELAR */}
                {/* ============================================ */}
                <Show when={showCancel()}>
                    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-md shadow-xl">
                            <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                                <h2 class="text-lg font-semibold text-red-600">Cancelar Day Pass</h2>
                                <button onClick={() => setShowCancel(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                            </div>
                            <div class="p-6 space-y-4">
                                <div class="bg-red-500/10 border border-red-500/30 rounded-md p-4">
                                    <p class="text-sm text-red-600 dark:text-red-400">
                                        ¿Cancelar el day pass de <strong>{cancelDp()?.visitorName}</strong>?
                                    </p>
                                    <Show when={cancelDp()?.paymentStatus === "pagado"}>
                                        <p class="text-sm text-red-500 mt-2">Este day pass ya fue pagado. Se procesará un reembolso automático de {formatPrice(cancelDp()?.totalAmount)}.</p>
                                    </Show>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo (opcional)</label>
                                    <textarea class="input-field w-full" rows="2" placeholder="Motivo de cancelación..." value={cancelReason()} onInput={(e) => setCancelReason(e.target.value)} />
                                </div>
                                <div class="flex gap-3 pt-2">
                                    <button onClick={() => setShowCancel(false)} class="btn-secondary flex-1">No, mantener</button>
                                    <button onClick={submitCancel} disabled={cancelLoading()} class="btn-primary flex-1 disabled:opacity-50 bg-red-600 hover:bg-red-700">
                                        {cancelLoading() ? "Cancelando..." : "Sí, cancelar"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Show>
            </Layout>
        </ProtectedRoute>
    );
}

export default DayPass;