import { createSignal, createResource, Show, For } from "solid-js";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "@solidjs/router";
import { showToast } from "../../utils/toast";
import PublicLayout from "../../components/public/PublicLayout";
import Pagination from "../../components/Pagination";
import LoyaltyCard from "../../components/public/LoyaltyCard";

const BACKEND_URL = "http://localhost:4000";

const STATUS_INFO = {
    pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    confirmada: { label: "Confirmada", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
    "check-in": { label: "Check-In", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
    "check-out": { label: "Check-Out", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
    cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

const PAYMENT_METHODS = [
    { value: "efectivo", label: "Efectivo" },
    { value: "tarjeta", label: "Tarjeta de Crédito/Débito" },
    { value: "transferencia", label: "Transferencia Bancaria" },
];

const RECEIPT_TYPES = [
    { value: "consumidor_final", label: "Consumidor Final" },
    { value: "credito_fiscal", label: "Crédito Fiscal" },
];

function ClientReservations() {
    const auth = useAuth();
    const navigate = useNavigate();

    // Redirigir si no está logueado
    if (!auth.isAuthenticated()) {
        navigate("/client-login");
        return null;
    }

    const [currentPage, setCurrentPage] = createSignal(1);
    const [statusFilter, setStatusFilter] = createSignal("");

    // Resource
    const [reservations, { refetch }] = createResource(
        () => ({ page: currentPage(), limit: 6, status: statusFilter() }),
        (params) => {
            const filters = { page: params.page, limit: params.limit };
            if (params.status) filters.status = params.status;
            return api.getMyReservations(filters);
        },
    );

    // ============================================
    // MODAL: Detalle
    // ============================================
    const [showDetail, setShowDetail] = createSignal(false);
    const [detailData, setDetailData] = createSignal(null);
    const [detailLoading, setDetailLoading] = createSignal(false);
    const [detailPayments, setDetailPayments] = createSignal([]);

    const openDetail = async (reservation) => {
        setDetailLoading(true);
        setShowDetail(true);
        try {
            const [resDetail, resPayments] = await Promise.all([
                api.getReservation(reservation._id),
                api.getPaymentsByReservation(reservation._id),
            ]);
            setDetailData(resDetail.data);
            setDetailPayments(resPayments.data || []);
        } catch (error) {
            showToast.error(error.message);
            setShowDetail(false);
        }
        setDetailLoading(false);
    };

    // ============================================
    // MODAL: Pago
    // ============================================
    const [showPayment, setShowPayment] = createSignal(false);
    const [paymentReservation, setPaymentReservation] = createSignal(null);
    const [paymentMethod, setPaymentMethod] = createSignal("tarjeta");
    const [receiptType, setReceiptType] = createSignal("consumidor_final");
    const [paymentNotes, setPaymentNotes] = createSignal("");
    const [paymentLoading, setPaymentLoading] = createSignal(false);

    const openPayment = async (reservation) => {
        setPaymentReservation(reservation);
        setPaymentMethod("tarjeta");
        setReceiptType("consumidor_final");
        setPaymentNotes("");
        setShowPayment(true);
        await auth.refreshUser();
    };

    const submitPayment = async () => {
        setPaymentLoading(true);
        try {
            await api.createPayment({
                reservation: paymentReservation()._id,
                paymentMethod: paymentMethod(),
                receiptType: receiptType(),
                notes: paymentNotes(),
            });
            showToast.success("Pago realizado exitosamente");
            setShowPayment(false);
            refetch();
            if (showDetail()) openDetail(detailData());
        } catch (error) {
            showToast.error(error.message);
        }
        setPaymentLoading(false);
    };

    // ============================================
    // MODAL: Cancelar
    // ============================================
    const [showCancel, setShowCancel] = createSignal(false);
    const [cancelReservation, setCancelReservation] = createSignal(null);
    const [cancelReason, setCancelReason] = createSignal("");
    const [cancelLoading, setCancelLoading] = createSignal(false);

    const openCancel = (reservation) => {
        setCancelReservation(reservation);
        setCancelReason("");
        setShowCancel(true);
    };

    const submitCancel = async () => {
        setCancelLoading(true);
        try {
            const result = await api.cancelReservation(cancelReservation()._id, cancelReason());
            showToast.success(result.msj || "Reserva cancelada");
            if (result.cancellationFee) showToast.info(result.cancellationFee);
            setShowCancel(false);
            refetch();
        } catch (error) {
            showToast.error(error.message);
        }
        setCancelLoading(false);
    };

    // Descargar comprobante
    const downloadReceipt = async (paymentId) => {
        try {
            const blob = await api.downloadReceipt(paymentId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `comprobante-${paymentId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            showToast.error(error.message);
        }
    };

    // ============================================
    // HELPERS
    // ============================================
    const getStatus = (status) => STATUS_INFO[status] || STATUS_INFO.pendiente;

    const formatDate = (date) => {
        if (!date) return "—";
        const d = typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)
            ? new Date(date + "T12:00:00")
            : new Date(date);
        return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(price || 0);
    };

    const calculateNights = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return 0;
        const diff = new Date(checkOut) - new Date(checkIn);
        return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const getRoomImage = (room) => {
        if (room?.images?.length > 0) return `${BACKEND_URL}${room.images[0]}`;
        return "https://placehold.co/400x300/1a1a2e/c9a84c?text=Habitación";
    };

    return (
        <PublicLayout transparent={false}>
            <div class="pt-28 pb-20 min-h-screen bg-[#f8f9fa]">
                <div class="max-w-5xl mx-auto px-6 lg:px-8">
                    {/* Header */}
                    <div class="flex items-center justify-between mb-10">
                        <div>
                            <h1
                                class="text-3xl md:text-4xl font-light text-[#1a1a2e]"
                                style={{ "font-family": "'Cormorant Garamond', serif" }}
                            >
                                Mis Reservas
                            </h1>
                            <p
                                class="text-gray-500 mt-2 text-sm"
                                style={{ "font-family": "'Montserrat', sans-serif", "font-weight": "300" }}
                            >
                                Gestiona tus reservas y pagos
                            </p>
                        </div>
                        <button
                            onClick={() => navigate("/search")}
                            class="px-6 py-2.5 bg-[#c9a84c] hover:bg-[#b8963f] text-white rounded-lg text-sm font-medium transition-colors tracking-wide"
                            style={{ "font-family": "'Montserrat', sans-serif" }}
                        >
                            Nueva Reserva
                        </button>
                    </div>
                    <LoyaltyCard />

                    {/* Filtro por estado */}
                    <div class="flex gap-2 mb-8 overflow-x-auto pb-2" style={{ "font-family": "'Montserrat', sans-serif" }}>
                        <button
                            onClick={() => { setStatusFilter(""); setCurrentPage(1); }}
                            class={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${!statusFilter()
                                    ? "bg-[#1a1a2e] text-white"
                                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"
                                }`}
                        >
                            Todas
                        </button>
                        <For each={Object.entries(STATUS_INFO)}>
                            {([value, info]) => (
                                <button
                                    onClick={() => { setStatusFilter(value); setCurrentPage(1); }}
                                    class={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${statusFilter() === value
                                            ? "bg-[#1a1a2e] text-white"
                                            : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"
                                        }`}
                                >
                                    {info.label}
                                </button>
                            )}
                        </For>
                    </div>

                    {/* Loading */}
                    <Show when={reservations.loading}>
                        <div class="text-center py-16 text-gray-500" style={{ "font-family": "'Montserrat', sans-serif" }}>
                            <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#c9a84c] border-r-transparent mb-4"></div>
                            <p>Cargando reservas...</p>
                        </div>
                    </Show>

                    {/* Reservations list */}
                    <Show when={reservations() && !reservations.loading}>
                        <Show
                            when={reservations()?.data?.length > 0}
                            fallback={
                                <div class="text-center py-20" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                    <svg class="w-16 h-16 mx-auto text-gray-300 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p class="text-gray-500 text-lg mb-2">No tienes reservas aún</p>
                                    <p class="text-gray-400 text-sm mb-6">Explora nuestras habitaciones y haz tu primera reserva</p>
                                    <button
                                        onClick={() => navigate("/search")}
                                        class="px-8 py-3 bg-[#c9a84c] hover:bg-[#b8963f] text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Buscar Habitaciones
                                    </button>
                                </div>
                            }
                        >
                            <div class="space-y-4">
                                <For each={reservations().data}>
                                    {(res) => {
                                        const status = getStatus(res.status);
                                        return (
                                            <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                                <div class="flex flex-col md:flex-row">
                                                    {/* Room image */}
                                                    <div class="md:w-48 h-40 md:h-auto flex-shrink-0">
                                                        <img
                                                            src={getRoomImage(res.room)}
                                                            alt=""
                                                            class="w-full h-full object-cover"
                                                        />
                                                    </div>

                                                    {/* Info */}
                                                    <div class="flex-1 p-5" style={{ "font-family": "'Montserrat', sans-serif" }}>
                                                        <div class="flex items-start justify-between mb-3">
                                                            <div>
                                                                <p class="text-xs text-gray-400 font-mono">{res.reservationCode}</p>
                                                                <h3
                                                                    class="text-lg font-semibold text-[#1a1a2e] mt-0.5"
                                                                    style={{ "font-family": "'Cormorant Garamond', serif" }}
                                                                >
                                                                    #{res.room?.roomNumber} — {res.room?.type}
                                                                </h3>
                                                            </div>
                                                            <span class={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                                {status.label}
                                                            </span>
                                                        </div>

                                                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                                                            <div>
                                                                <p class="text-xs text-gray-400 uppercase tracking-wider">Check-In</p>
                                                                <p class="text-gray-700 font-medium">{formatDate(res.checkIn)}</p>
                                                            </div>
                                                            <div>
                                                                <p class="text-xs text-gray-400 uppercase tracking-wider">Check-Out</p>
                                                                <p class="text-gray-700 font-medium">{formatDate(res.checkOut)}</p>
                                                            </div>
                                                            <div>
                                                                <p class="text-xs text-gray-400 uppercase tracking-wider">Noches</p>
                                                                <p class="text-gray-700 font-medium">{calculateNights(res.checkIn, res.checkOut)}</p>
                                                            </div>
                                                            <div>
                                                                <p class="text-xs text-gray-400 uppercase tracking-wider">Total</p>
                                                                <p class="text-[#1a1a2e] font-semibold">{formatPrice(res.totalAmount)}</p>
                                                            </div>
                                                        </div>

                                                        {/* Payment status + actions */}
                                                        <div class="flex items-center justify-between pt-3 border-t border-gray-50">
                                                            <div class="flex items-center gap-2">
                                                                <div class={`w-2 h-2 rounded-full ${res.paymentStatus === "pagado" ? "bg-green-500"
                                                                        : res.paymentStatus === "reembolsado" ? "bg-red-500"
                                                                            : "bg-amber-500"
                                                                    }`} />
                                                                <span class="text-xs text-gray-500">
                                                                    Pago: {res.paymentStatus === "pagado" ? "Pagado" : res.paymentStatus === "reembolsado" ? "Reembolsado" : "Pendiente"}
                                                                </span>
                                                            </div>

                                                            <div class="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => openDetail(res)}
                                                                    class="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors"
                                                                >
                                                                    Ver Detalle
                                                                </button>
                                                                <Show when={res.paymentStatus === "pendiente" && res.status !== "cancelada"}>
                                                                    <button
                                                                        onClick={() => openPayment(res)}
                                                                        class="px-4 py-1.5 text-xs font-medium text-white bg-[#c9a84c] hover:bg-[#b8963f] rounded-lg transition-colors"
                                                                    >
                                                                        Pagar
                                                                    </button>
                                                                </Show>
                                                                <Show when={!["cancelada", "check-out", 'check-in'].includes(res.status)}>
                                                                    <button
                                                                        onClick={() => openCancel(res)}
                                                                        class="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </Show>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }}
                                </For>
                            </div>

                            <Show when={reservations()?.pagination?.totalPages > 1}>
                                <div class="mt-8">
                                    <Pagination
                                        currentPage={currentPage()}
                                        totalPages={reservations().pagination.totalPages}
                                        onPageChange={(p) => setCurrentPage(p)}
                                    />
                                </div>
                            </Show>
                        </Show>
                    </Show>
                </div>
            </div>

            {/* ============================================ */}
            {/* MODAL: DETALLE */}
            {/* ============================================ */}
            <Show when={showDetail()}>
                <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div class="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col" style={{ "font-family": "'Montserrat', sans-serif" }}>
                        <div class="flex justify-between items-center px-6 py-4 border-b border-gray-100 flex-shrink-0">
                            <h2 class="text-lg font-semibold text-[#1a1a2e]" style={{ "font-family": "'Cormorant Garamond', serif" }}>
                                Detalle de Reserva
                            </h2>
                            <button onClick={() => setShowDetail(false)} class="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <div class="flex-1 overflow-y-auto p-6">
                            <Show when={!detailLoading()} fallback={<div class="text-center py-8 text-gray-500">Cargando...</div>}>
                                <Show when={detailData()}>
                                    {(r) => {
                                        const res = r();
                                        const status = getStatus(res.status);
                                        return (
                                            <div class="space-y-6">
                                                {/* Header */}
                                                <div class="flex items-center justify-between">
                                                    <div>
                                                        <p class="text-sm font-mono text-gray-400">{res.reservationCode}</p>
                                                        <span class={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    <p class="text-2xl font-semibold text-[#1a1a2e]" style={{ "font-family": "'Cormorant Garamond', serif" }}>
                                                        {formatPrice(res.totalAmount)}
                                                    </p>
                                                </div>

                                                {/* Room */}
                                                <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                                    <Show when={res.room?.images?.length > 0}>
                                                        <img src={`${BACKEND_URL}${res.room.images[0]}`} alt="" class="w-20 h-20 rounded-lg object-cover" />
                                                    </Show>
                                                    <div>
                                                        <p class="font-semibold text-[#1a1a2e]" style={{ "font-family": "'Cormorant Garamond', serif" }}>
                                                            #{res.room?.roomNumber} — {res.room?.type}
                                                        </p>
                                                        <p class="text-xs text-gray-500">Piso {res.room?.floor || "—"}</p>
                                                    </div>
                                                </div>

                                                {/* Dates */}
                                                <div class="grid grid-cols-3 gap-4">
                                                    <div class="text-center p-3 bg-gray-50 rounded-xl">
                                                        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Check-In</p>
                                                        <p class="text-sm font-medium text-gray-700">{formatDate(res.checkIn)}</p>
                                                    </div>
                                                    <div class="text-center p-3 bg-gray-50 rounded-xl">
                                                        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Check-Out</p>
                                                        <p class="text-sm font-medium text-gray-700">{formatDate(res.checkOut)}</p>
                                                    </div>
                                                    <div class="text-center p-3 bg-gray-50 rounded-xl">
                                                        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Noches</p>
                                                        <p class="text-sm font-medium text-gray-700">{calculateNights(res.checkIn, res.checkOut)}</p>
                                                    </div>
                                                </div>

                                                {/* Details */}
                                                <div class="grid grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                        <p class="text-xs text-gray-400">Huéspedes</p>
                                                        <p class="text-gray-700">{res.numberOfGuests}</p>
                                                    </div>
                                                    <Show when={res.pricePerNight}>
                                                        <div>
                                                            <p class="text-xs text-gray-400">Precio/noche</p>
                                                            <p class="text-gray-700">{formatPrice(res.pricePerNight)}</p>
                                                        </div>
                                                    </Show>
                                                    <Show when={res.specialRequests}>
                                                        <div class="col-span-2">
                                                            <p class="text-xs text-gray-400">Solicitudes especiales</p>
                                                            <p class="text-gray-700">{res.specialRequests}</p>
                                                        </div>
                                                    </Show>
                                                </div>

                                                {/* Cancellation */}
                                                <Show when={res.status === "cancelada"}>
                                                    <div class="p-4 bg-red-50 rounded-xl border border-red-100">
                                                        <p class="text-xs font-semibold text-red-700 uppercase mb-1">Cancelación</p>
                                                        <p class="text-sm text-red-600">{res.cancellationReason || "Sin motivo"}</p>
                                                        <Show when={res.cancellationFee > 0}>
                                                            <p class="text-sm font-medium text-red-700 mt-1">Penalización: {formatPrice(res.cancellationFee)}</p>
                                                        </Show>
                                                    </div>
                                                </Show>

                                                {/* Payments */}
                                                <Show when={detailPayments().length > 0}>
                                                    <div>
                                                        <p class="text-xs font-semibold text-gray-400 uppercase mb-3">Pagos</p>
                                                        <div class="space-y-2">
                                                            <For each={detailPayments()}>
                                                                {(payment) => (
                                                                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                                        <div>
                                                                            <p class="text-sm font-medium text-gray-700">{formatPrice(payment.amount)}</p>
                                                                            <p class="text-xs text-gray-400">{payment.receiptNumber} • {formatDate(payment.paymentDate)}</p>
                                                                        </div>
                                                                        <div class="flex items-center gap-2">
                                                                            <span class={`text-xs font-medium ${payment.status === "completado" ? "text-green-600" : "text-red-600"
                                                                                }`}>
                                                                                {payment.status}
                                                                            </span>
                                                                            <Show when={payment.status === "completado"}>
                                                                                <button
                                                                                    onClick={() => downloadReceipt(payment._id)}
                                                                                    class="px-2 py-1 text-xs border border-gray-200 rounded-md text-gray-600 hover:border-gray-400 transition-colors"
                                                                                >
                                                                                    PDF
                                                                                </button>
                                                                            </Show>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </For>
                                                        </div>
                                                    </div>
                                                </Show>

                                                {/* Actions */}
                                                <div class="flex gap-2 pt-2">
                                                    <Show when={res.paymentStatus === "pendiente" && res.status !== "cancelada"}>
                                                        <button
                                                            onClick={() => { setShowDetail(false); openPayment(res); }}
                                                            class="flex-1 py-3 bg-[#c9a84c] hover:bg-[#b8963f] text-white rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            Pagar Ahora
                                                        </button>
                                                    </Show>
                                                    <Show when={!["cancelada", "check-out"].includes(res.status)}>
                                                        <button
                                                            onClick={() => { setShowDetail(false); openCancel(res); }}
                                                            class="flex-1 py-3 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                                                        >
                                                            Cancelar Reserva
                                                        </button>
                                                    </Show>
                                                </div>
                                            </div>
                                        );
                                    }}
                                </Show>
                            </Show>
                        </div>

                        <div class="px-6 py-4 border-t border-gray-100 flex-shrink-0">
                            <button onClick={() => setShowDetail(false)} class="w-full py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </Show>

            {/* ============================================ */}
            {/* MODAL: PAGO */}
            {/* ============================================ */}
            <Show when={showPayment()}>
                <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div class="bg-white rounded-2xl w-full max-w-md shadow-xl" style={{ "font-family": "'Montserrat', sans-serif" }}>
                        <div class="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                            <h2 class="text-lg font-semibold text-[#1a1a2e]" style={{ "font-family": "'Cormorant Garamond', serif" }}>
                                Realizar Pago
                            </h2>
                            <button onClick={() => setShowPayment(false)} class="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <div class="p-6 space-y-5">
                            {/* Reservation summary */}
                            <div class="p-4 bg-gray-50 rounded-xl text-center">
                                <p class="text-xs text-gray-400 font-mono">{paymentReservation()?.reservationCode}</p>
                                <p
                                    class="text-3xl font-semibold text-[#1a1a2e] mt-1"
                                    style={{ "font-family": "'Cormorant Garamond', serif" }}
                                >
                                    {formatPrice(paymentReservation()?.totalAmount)}
                                </p>
                                <p class="text-xs text-gray-500 mt-1">
                                    #{paymentReservation()?.room?.roomNumber} — {paymentReservation()?.room?.type}
                                </p>
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Método de pago</label>
                                <select
                                    class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#c9a84c]"
                                    value={paymentMethod()} onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    <For each={PAYMENT_METHODS}>{(m) => <option value={m.value}>{m.label}</option>}</For>
                                </select>
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Tipo de comprobante</label>
                                <select
                                    class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#c9a84c]"
                                    value={receiptType()} onChange={(e) => setReceiptType(e.target.value)}
                                >
                                    <For each={RECEIPT_TYPES}>{(r) => <option value={r.value}>{r.label}</option>}</For>
                                </select>
                            </div>

                            <Show when={receiptType() === "credito_fiscal" && !auth.user()?.documentNumber}>
                                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <p class="text-xs text-yellow-700">
                                        ⚠️ No tienes DUI/documento registrado en tu perfil. Contacta al personal del hotel para actualizar tus datos antes de emitir Crédito Fiscal.
                                    </p>
                                </div>
                            </Show>

                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Notas (opcional)</label>
                                <textarea
                                    class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#c9a84c]"
                                    rows="2" placeholder="Notas adicionales..."
                                    value={paymentNotes()} onInput={(e) => setPaymentNotes(e.target.value)}
                                />
                            </div>

                            <div class="flex gap-3 pt-2">
                                <button onClick={() => setShowPayment(false)} class="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                                    Cancelar
                                </button>
                                <button
                                    onClick={submitPayment} disabled={paymentLoading() || (receiptType() === "credito_fiscal" && !auth.user()?.documentNumber)}
                                    class="flex-1 py-3 bg-[#c9a84c] hover:bg-[#b8963f] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {paymentLoading() ? "Procesando..." : "Confirmar Pago"}
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
                    <div class="bg-white rounded-2xl w-full max-w-md shadow-xl" style={{ "font-family": "'Montserrat', sans-serif" }}>
                        <div class="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                            <h2 class="text-lg font-semibold text-red-600" style={{ "font-family": "'Cormorant Garamond', serif" }}>
                                Cancelar Reserva
                            </h2>
                            <button onClick={() => setShowCancel(false)} class="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <div class="p-6 space-y-5">
                            <div class="p-4 bg-red-50 rounded-xl border border-red-100">
                                <p class="text-sm text-red-700">
                                    Estás a punto de cancelar la reserva <strong>{cancelReservation()?.reservationCode}</strong>.
                                    Esta acción puede generar una penalización según la política de cancelación.
                                </p>
                                <Show when={cancelReservation()?.paymentStatus === "pagado"}>
                                    <p class="text-sm text-red-600 mt-2">
                                        Esta reserva ya fue pagada. Se procesará un reembolso automático descontando la penalización.
                                    </p>
                                </Show>
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Motivo de cancelación</label>
                                <textarea
                                    class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-red-300"
                                    rows="3" placeholder="Indica el motivo..."
                                    value={cancelReason()} onInput={(e) => setCancelReason(e.target.value)}
                                />
                            </div>

                            <div class="flex gap-3 pt-2">
                                <button onClick={() => setShowCancel(false)} class="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                                    No, mantener
                                </button>
                                <button
                                    onClick={submitCancel} disabled={cancelLoading()}
                                    class="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {cancelLoading() ? "Cancelando..." : "Sí, cancelar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>
        </PublicLayout>
    );
}

export default ClientReservations;