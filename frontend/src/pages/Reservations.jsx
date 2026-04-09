import { createSignal, createResource, Show, For, onMount } from "solid-js";
import { api } from "../services/api";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "@solidjs/router";
import { showToast } from "../utils/toast";
import Pagination from "../components/Pagination";

const BACKEND_URL = "http://localhost:4000";

const RESERVATION_STATUSES = [
  { value: "pendiente", label: "Pendiente", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" },
  { value: "confirmada", label: "Confirmada", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" },
  { value: "check-in", label: "Check-In", color: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" },
  { value: "check-out", label: "Check-Out", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
  { value: "cancelada", label: "Cancelada", color: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" },
];

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta de Crédito/Débito" },
  { value: "transferencia", label: "Transferencia Bancaria" },
];

const RECEIPT_TYPES = [
  { value: "consumidor_final", label: "Consumidor Final" },
  { value: "credito_fiscal", label: "Crédito Fiscal" },
];

function Reservations() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (!auth.hasPermission("reservations.read")) {
    navigate("/dashboard");
    return null;
  }

  // Determinar si es staff o cliente
  const isStaff = () =>
    auth.hasPermission("reservations.create_others") ||
    auth.hasPermission("reservations.checkin") ||
    auth.hasPermission("reservations.checkout");

  // ============================================
  // VISTA: Tabs staff / mis reservas
  // ============================================
  const [activeTab, setActiveTab] = createSignal(isStaff() ? "all" : "my");
  const [currentPage, setCurrentPage] = createSignal(1);
  const [limit] = createSignal(10);

  // Filtros
  const [statusFilter, setStatusFilter] = createSignal("");
  const [searchFilter, setSearchFilter] = createSignal("");
  const [appliedFilters, setAppliedFilters] = createSignal({ status: "", search: "" });

  // Resource de reservas
  const [reservations, { refetch }] = createResource(
    () => ({
      tab: activeTab(),
      page: currentPage(),
      limit: limit(),
      ...appliedFilters(),
    }),
    async (params) => {
      const filters = { page: params.page, limit: params.limit };
      if (params.status) filters.status = params.status;

      if (params.tab === "my") {
        return api.getMyReservations(filters);
      } else {
        if (params.search) filters.client = params.search;
        return api.getReservations(filters);
      }
    },
  );

  const applyFilters = () => {
    setAppliedFilters({ status: statusFilter(), search: searchFilter() });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setStatusFilter("");
    setSearchFilter("");
    setAppliedFilters({ status: "", search: "" });
    setCurrentPage(1);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    clearFilters();
  };

  // ============================================
  // MODAL: Detalle de Reserva
  // ============================================
  const [showDetail, setShowDetail] = createSignal(false);
  const [detailReservation, setDetailReservation] = createSignal(null);
  const [detailLoading, setDetailLoading] = createSignal(false);
  const [reservationPayments, setReservationPayments] = createSignal([]);

  const openDetail = async (reservation) => {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const [resDetail, resPayments] = await Promise.all([
        api.getReservation(reservation._id),
        api.getPaymentsByReservation(reservation._id),
      ]);
      setDetailReservation(resDetail.data);
      setReservationPayments(resPayments.data || []);
    } catch (error) {
      showToast.error(error.message);
      setShowDetail(false);
    }
    setDetailLoading(false);
  };

  // ============================================
  // MODAL: Crear Reserva (Wizard paso a paso)
  // ============================================
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [createStep, setCreateStep] = createSignal(1);
  const [createLoading, setCreateLoading] = createSignal(false);

  // Step 1: Búsqueda
  const [searchCheckIn, setSearchCheckIn] = createSignal("");
  const [searchCheckOut, setSearchCheckOut] = createSignal("");
  const [searchGuests, setSearchGuests] = createSignal(1);
  const [searchType, setSearchType] = createSignal("");
  const [availableRooms, setAvailableRooms] = createSignal([]);
  const [searchingRooms, setSearchingRooms] = createSignal(false);

  // Step 2: Habitación seleccionada
  const [selectedRoom, setSelectedRoom] = createSignal(null);

  // Step 3: Datos adicionales (staff)
  const [clientEmail, setClientEmail] = createSignal("");
  const [clientName, setClientName] = createSignal("");
  const [clientPhone, setClientPhone] = createSignal("");
  const [specialRequests, setSpecialRequests] = createSignal("");

  const openCreateModal = () => {
    setCreateStep(1);
    setSearchCheckIn("");
    setSearchCheckOut("");
    setSearchGuests(1);
    setSearchType("");
    setAvailableRooms([]);
    setSelectedRoom(null);
    setClientEmail("");
    setClientName("");
    setClientPhone("");
    setSpecialRequests("");
    setShowCreateModal(true);
  };

  // Step 1: Buscar disponibilidad
  const searchAvailability = async () => {
    if (!searchCheckIn() || !searchCheckOut()) {
      showToast.error("Selecciona las fechas de entrada y salida");
      return;
    }
    setSearchingRooms(true);
    try {
      const filters = {
        checkIn: searchCheckIn(),
        checkOut: searchCheckOut(),
        guests: searchGuests(),
      };
      if (searchType()) filters.type = searchType();

      const result = await api.searchAvailableRooms(filters);
      setAvailableRooms(result.data || []);
      if (result.data?.length === 0) {
        showToast.info("No hay habitaciones disponibles para esas fechas");
      }
    } catch (error) {
      showToast.error(error.message);
    }
    setSearchingRooms(false);
  };

  // Step 2: Seleccionar habitación
  const selectRoom = (room) => {
    setSelectedRoom(room);
    // Si es staff con permiso create_others, ir a paso 3
    // Si es cliente, saltar directo al paso 4 (confirmar)
    if (auth.hasPermission("reservations.create_others")) {
      setCreateStep(3);
    } else {
      setCreateStep(4);
    }
  };

  // Step 4: Confirmar y crear
  const confirmReservation = async () => {
    setCreateLoading(true);
    try {
      const data = {
        room: selectedRoom()._id,
        checkIn: searchCheckIn(),
        checkOut: searchCheckOut(),
        numberOfGuests: searchGuests(),
        specialRequests: specialRequests(),
      };

      // Si es staff creando para otro
      if (auth.hasPermission("reservations.create_others") && clientEmail()) {
        data.clientEmail = clientEmail();
        data.clientName = clientName();
        data.clientPhone = clientPhone();
      }

      await api.createReservation(data);
      showToast.success("Reserva creada exitosamente");
      setShowCreateModal(false);
      refetch();
    } catch (error) {
      showToast.error(error.message);
    }
    setCreateLoading(false);
  };

  // ============================================
  // MODAL: Pago
  // ============================================
  const [showPaymentModal, setShowPaymentModal] = createSignal(false);
  const [paymentReservation, setPaymentReservation] = createSignal(null);
  const [paymentMethod, setPaymentMethod] = createSignal("efectivo");
  const [receiptType, setReceiptType] = createSignal("consumidor_final");
  const [paymentNotes, setPaymentNotes] = createSignal("");
  const [paymentLoading, setPaymentLoading] = createSignal(false);

  const openPaymentModal = (reservation) => {
    setPaymentReservation(reservation);
    setPaymentMethod("efectivo");
    setReceiptType("consumidor_final");
    setPaymentNotes("");
    setShowPaymentModal(true);
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
      showToast.success("Pago registrado exitosamente");
      setShowPaymentModal(false);
      refetch();
      // Si el detalle estaba abierto, refrescarlo
      if (showDetail() && detailReservation()) {
        openDetail(detailReservation());
      }
    } catch (error) {
      showToast.error(error.message);
    }
    setPaymentLoading(false);
  };

  // ============================================
  // MODAL: Cancelar
  // ============================================
  const [showCancelModal, setShowCancelModal] = createSignal(false);
  const [cancelReservation, setCancelReservation] = createSignal(null);
  const [cancelReason, setCancelReason] = createSignal("");
  const [cancelLoading, setCancelLoading] = createSignal(false);

  const openCancelModal = (reservation) => {
    setCancelReservation(reservation);
    setCancelReason("");
    setShowCancelModal(true);
  };

  const submitCancel = async () => {
    setCancelLoading(true);
    try {
      const result = await api.cancelReservation(cancelReservation()._id, cancelReason());
      showToast.success(result.msj || "Reserva cancelada");
      if (result.cancellationFee) {
        showToast.info(result.cancellationFee);
      }
      setShowCancelModal(false);
      refetch();
    } catch (error) {
      showToast.error(error.message);
    }
    setCancelLoading(false);
  };

  // ============================================
  // ACCIONES: Check-in / Check-out
  // ============================================
  const handleCheckIn = (reservation) => {
    showToast.confirm(
      `¿Realizar check-in para la reserva ${reservation.reservationCode}?`,
      async () => {
        try {
          await api.checkIn(reservation._id);
          showToast.success("Check-in realizado exitosamente");
          refetch();
          if (showDetail()) openDetail(reservation);
        } catch (error) {
          showToast.error(error.message);
        }
      },
    );
  };

  const handleCheckOut = (reservation) => {
    showToast.confirm(
      `¿Realizar check-out para la reserva ${reservation.reservationCode}?`,
      async () => {
        try {
          await api.checkOut(reservation._id);
          showToast.success("Check-out realizado exitosamente");
          refetch();
          if (showDetail()) openDetail(reservation);
        } catch (error) {
          showToast.error(error.message);
        }
      },
    );
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
  const getStatusInfo = (status) => {
    return RESERVATION_STATUSES.find((s) => s.value === status) || RESERVATION_STATUSES[0];
  };

  const formatDate = (date) => {
    if (!date) return "—";
    const d = typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)
      ? new Date(date + "T12:00:00")
      : new Date(date);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-SV", {
      style: "currency",
      currency: "USD",
    }).format(price || 0);
  };

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut) - new Date(checkIn);
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const paymentStatusColor = (status) => {
    const colors = {
      pendiente: "text-yellow-600 dark:text-yellow-400",
      pagado: "text-green-600 dark:text-green-400",
      reembolsado: "text-red-600 dark:text-red-400",
    };
    return colors[status] || "text-gray-600 dark:text-gray-400";
  };

  const paymentStatusLabel = (status) => {
    const labels = { pendiente: "Pendiente", pagado: "Pagado", reembolsado: "Reembolsado" };
    return labels[status] || status;
  };

  // Obtener la fecha mínima (hoy) para los inputs date
  const todayStr = () => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div class="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div class="flex justify-between items-center mb-8">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                Reservas
              </h1>
              <p class="text-gray-500 dark:text-gray-400 mt-1">
                {isStaff() ? "Gestiona las reservas del hotel" : "Tus reservas"}
              </p>
            </div>
            <Show when={auth.hasPermission("reservations.create")}>
              <button onClick={openCreateModal} class="btn-primary">
                + Nueva reserva
              </button>
            </Show>
          </div>

          {/* Tabs: Todas / Mis Reservas (solo staff ve ambas) */}
          <Show when={isStaff()}>
            <div class="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-1 w-fit">
              <button
                onClick={() => switchTab("all")}
                class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab() === "all"
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                Todas las reservas
              </button>
              <button
                onClick={() => switchTab("my")}
                class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab() === "my"
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                Mis reservas
              </button>
            </div>
          </Show>

          {/* Filtros */}
          <div class="card mb-6">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Filtros</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                class="input-field"
                value={statusFilter()}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <For each={RESERVATION_STATUSES}>
                  {(s) => <option value={s.value}>{s.label}</option>}
                </For>
              </select>

              <Show when={activeTab() === "all"}>
                <input
                  type="text"
                  class="input-field"
                  placeholder="Buscar por ID de cliente..."
                  value={searchFilter()}
                  onInput={(e) => setSearchFilter(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && applyFilters()}
                />
              </Show>

              <div class="flex gap-3">
                <button onClick={applyFilters} class="btn-primary">
                  🔍 Buscar
                </button>
                <button onClick={clearFilters} class="btn-secondary">
                  ✕ Limpiar
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de Reservas */}
          <div class="card overflow-hidden p-0">
            <Show when={reservations.loading}>
              <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                Cargando reservas...
              </div>
            </Show>

            <Show when={reservations.error}>
              <div class="p-8 text-center text-red-500">Error al cargar reservas</div>
            </Show>

            <Show when={reservations()}>
              <Show
                when={reservations()?.data?.length > 0}
                fallback={
                  <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron reservas
                  </div>
                }
              >
                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead>
                      <tr class="border-b border-gray-200 dark:border-gray-800">
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Código
                        </th>
                        <Show when={activeTab() === "all"}>
                          <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Cliente
                          </th>
                        </Show>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Habitación
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Fechas
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Total
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Estado
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Pago
                        </th>
                        <th class="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={reservations()?.data}>
                        {(res) => {
                          const statusInfo = getStatusInfo(res.status);
                          return (
                            <tr class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                              <td class="px-6 py-4">
                                <p class="text-sm font-mono font-medium text-gray-900 dark:text-white">
                                  {res.reservationCode}
                                </p>
                              </td>
                              <Show when={activeTab() === "all"}>
                                <td class="px-6 py-4">
                                  <p class="text-sm text-gray-900 dark:text-white">{res.client?.name || "—"}</p>
                                  <p class="text-xs text-gray-500 dark:text-gray-400">{res.client?.email || ""}</p>
                                </td>
                              </Show>
                              <td class="px-6 py-4">
                                <p class="text-sm text-gray-900 dark:text-white">
                                  #{res.room?.roomNumber}
                                </p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">{res.room?.type}</p>
                              </td>
                              <td class="px-6 py-4">
                                <p class="text-sm text-gray-700 dark:text-gray-300">
                                  {formatDate(res.checkIn)}
                                </p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                  → {formatDate(res.checkOut)}
                                </p>
                              </td>
                              <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                {formatPrice(res.totalAmount)}
                              </td>
                              <td class="px-6 py-4">
                                <span class={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                              </td>
                              <td class="px-6 py-4">
                                <span class={`text-xs font-medium ${paymentStatusColor(res.paymentStatus)}`}>
                                  {paymentStatusLabel(res.paymentStatus)}
                                </span>
                              </td>
                              <td class="px-6 py-4">
                                <div class="flex items-center gap-2 justify-end flex-wrap">
                                  {/* Ver detalle */}
                                  <button
                                    onClick={() => openDetail(res)}
                                    class="text-xs px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                                  >
                                    Detalle
                                  </button>

                                  {/* Pagar - si está pendiente de pago */}
                                  <Show when={res.paymentStatus === "pendiente" && res.status !== "cancelada" && auth.hasPermission("payments.create")}>
                                    <button
                                      onClick={() => openPaymentModal(res)}
                                      class="text-xs px-3 py-1.5 rounded-md border border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                                    >
                                      Pagar
                                    </button>
                                  </Show>

                                  {/* Check-in */}
                                  <Show when={res.status === "confirmada" && res.paymentStatus === "pagado" && auth.hasPermission("reservations.checkin")}>
                                    <button
                                      onClick={() => handleCheckIn(res)}
                                      class="text-xs px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                    >
                                      Check-in
                                    </button>
                                  </Show>

                                  {/* Check-out */}
                                  <Show when={res.status === "check-in" && auth.hasPermission("reservations.checkout")}>
                                    <button
                                      onClick={() => handleCheckOut(res)}
                                      class="text-xs px-3 py-1.5 rounded-md border border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                                    >
                                      Check-out
                                    </button>
                                  </Show>

                                  {/* Cancelar */}
                                  <Show when={!["cancelada", "check-out"].includes(res.status) && auth.hasPermission("reservations.update")}>
                                    <button
                                      onClick={() => openCancelModal(res)}
                                      class="text-xs px-3 py-1.5 rounded-md border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                  </Show>
                                </div>
                              </td>
                            </tr>
                          );
                        }}
                      </For>
                    </tbody>
                  </table>
                </div>

                <Show when={reservations()?.pagination}>
                  <Pagination
                    currentPage={currentPage()}
                    totalPages={reservations().pagination.totalPages}
                    onPageChange={(p) => setCurrentPage(p)}
                  />
                </Show>
              </Show>
            </Show>
          </div>
        </div>

        {/* ============================================ */}
        {/* MODAL: DETALLE DE RESERVA */}
        {/* ============================================ */}
        <Show when={showDetail()}>
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
              <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Detalle de Reserva
                </h2>
                <button
                  onClick={() => setShowDetail(false)}
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div class="flex-1 overflow-y-auto p-6">
                <Show
                  when={!detailLoading()}
                  fallback={
                    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                      Cargando...
                    </div>
                  }
                >
                  <Show when={detailReservation()}>
                    {(res) => {
                      const r = res();
                      const statusInfo = getStatusInfo(r.status);
                      return (
                        <div class="space-y-6">
                          {/* Header info */}
                          <div class="flex items-center justify-between">
                            <div>
                              <p class="text-xl font-mono font-bold text-gray-900 dark:text-white">
                                {r.reservationCode}
                              </p>
                              <span class={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            <div class="text-right">
                              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatPrice(r.totalAmount)}
                              </p>
                              <p class={`text-sm font-medium ${paymentStatusColor(r.paymentStatus)}`}>
                                {paymentStatusLabel(r.paymentStatus)}
                              </p>
                            </div>
                          </div>

                          {/* Cliente */}
                          <div class="card">
                            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Cliente</p>
                            <p class="text-sm font-medium text-gray-900 dark:text-white">{r.client?.name}</p>
                            <p class="text-sm text-gray-500 dark:text-gray-400">{r.client?.email}</p>
                            <Show when={r.client?.phone}>
                              <p class="text-sm text-gray-500 dark:text-gray-400">{r.client.phone}</p>
                            </Show>
                          </div>

                          {/* Habitación */}
                          <div class="card">
                            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Habitación</p>
                            <div class="flex items-center gap-3">
                              <Show when={r.room?.images?.length > 0}>
                                <img
                                  src={`${BACKEND_URL}${r.room.images[0]}`}
                                  alt=""
                                  class="w-16 h-16 rounded-lg object-cover"
                                />
                              </Show>
                              <div>
                                <p class="text-sm font-medium text-gray-900 dark:text-white">
                                  #{r.room?.roomNumber} — {r.room?.type}
                                </p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                  Piso {r.room?.floor || "—"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Fechas */}
                          <div class="grid grid-cols-3 gap-4">
                            <div class="card text-center">
                              <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Check-In</p>
                              <p class="text-sm font-medium text-gray-900 dark:text-white">{formatDate(r.checkIn)}</p>
                            </div>
                            <div class="card text-center">
                              <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Check-Out</p>
                              <p class="text-sm font-medium text-gray-900 dark:text-white">{formatDate(r.checkOut)}</p>
                            </div>
                            <div class="card text-center">
                              <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Noches</p>
                              <p class="text-sm font-medium text-gray-900 dark:text-white">
                                {calculateNights(r.checkIn, r.checkOut)}
                              </p>
                            </div>
                          </div>

                          {/* Detalles adicionales */}
                          <div class="card">
                            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Detalles</p>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                              <p class="text-gray-500 dark:text-gray-400">Huéspedes:</p>
                              <p class="text-gray-900 dark:text-white">{r.numberOfGuests}</p>
                              <Show when={r.pricePerNight}>
                                <p class="text-gray-500 dark:text-gray-400">Precio/noche:</p>
                                <p class="text-gray-900 dark:text-white">{formatPrice(r.pricePerNight)}</p>
                              </Show>
                              <Show when={r.specialRequests}>
                                <p class="text-gray-500 dark:text-gray-400">Solicitudes:</p>
                                <p class="text-gray-900 dark:text-white">{r.specialRequests}</p>
                              </Show>
                              <Show when={r.createdBy}>
                                <p class="text-gray-500 dark:text-gray-400">Creada por:</p>
                                <p class="text-gray-900 dark:text-white">{r.createdBy?.name}</p>
                              </Show>
                            </div>
                          </div>

                          {/* Cancelación info */}
                          <Show when={r.status === "cancelada"}>
                            <div class="card border-l-4 border-l-red-500">
                              <p class="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-2">Cancelación</p>
                              <p class="text-sm text-gray-700 dark:text-gray-300">{r.cancellationReason || "Sin motivo"}</p>
                              <Show when={r.cancellationFee > 0}>
                                <p class="text-sm font-medium text-red-600 dark:text-red-400 mt-1">
                                  Penalización: {formatPrice(r.cancellationFee)}
                                </p>
                              </Show>
                            </div>
                          </Show>

                          {/* Pagos asociados */}
                          <Show when={reservationPayments().length > 0}>
                            <div>
                              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Pagos</p>
                              <div class="space-y-2">
                                <For each={reservationPayments()}>
                                  {(payment) => (
                                    <div class="card flex items-center justify-between">
                                      <div>
                                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                                          {formatPrice(payment.amount)}
                                          <span class="text-xs text-gray-500 ml-2">
                                            {PAYMENT_METHODS.find((m) => m.value === payment.paymentMethod)?.label || payment.paymentMethod}
                                          </span>
                                        </p>
                                        <p class="text-xs text-gray-500 dark:text-gray-400">
                                          {payment.receiptNumber} — {formatDate(payment.paymentDate)}
                                        </p>
                                      </div>
                                      <div class="flex items-center gap-2">
                                        <span class={`text-xs font-medium ${payment.status === "completado" ? "text-green-600 dark:text-green-400" : payment.status === "reembolsado" ? "text-red-600 dark:text-red-400" : "text-gray-500"}`}>
                                          {payment.status}
                                        </span>
                                        <Show when={payment.status === "completado"}>
                                          <button
                                            onClick={() => downloadReceipt(payment._id)}
                                            class="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 transition-colors"
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

                          {/* Acciones del detalle */}
                          <div class="flex gap-2 flex-wrap pt-2">
                            <Show when={r.paymentStatus === "pendiente" && r.status !== "cancelada" && auth.hasPermission("payments.create")}>
                              <button onClick={() => { setShowDetail(false); openPaymentModal(r); }} class="btn-primary">
                                Registrar Pago
                              </button>
                            </Show>
                            <Show when={r.status === "confirmada" && r.paymentStatus === "pagado" && auth.hasPermission("reservations.checkin")}>
                              <button onClick={() => handleCheckIn(r)} class="btn-primary">
                                Check-in
                              </button>
                            </Show>
                            <Show when={r.status === "check-in" && auth.hasPermission("reservations.checkout")}>
                              <button onClick={() => handleCheckOut(r)} class="btn-primary">
                                Check-out
                              </button>
                            </Show>
                            <Show when={!["cancelada", "check-out"].includes(r.status) && auth.hasPermission("reservations.update")}>
                              <button onClick={() => { setShowDetail(false); openCancelModal(r); }} class="btn-secondary text-red-600 dark:text-red-400">
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

              <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                <button onClick={() => setShowDetail(false)} class="btn-secondary w-full">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </Show>

        {/* ============================================ */}
        {/* MODAL: CREAR RESERVA (WIZARD) */}
        {/* ============================================ */}
        <Show when={showCreateModal()}>
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
              {/* Header con pasos */}
              <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <div class="flex justify-between items-center mb-3">
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                    Nueva Reserva
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
                {/* Step indicators */}
                <div class="flex gap-2">
                  <For each={[
                    { n: 1, label: "Fechas" },
                    { n: 2, label: "Habitación" },
                    ...(auth.hasPermission("reservations.create_others") ? [{ n: 3, label: "Cliente" }] : []),
                    { n: auth.hasPermission("reservations.create_others") ? 4 : 3, label: "Confirmar" },
                  ]}>
                    {(step) => (
                      <div class={`flex-1 h-1.5 rounded-full transition-colors ${createStep() >= step.n
                          ? "bg-blue-500"
                          : "bg-gray-200 dark:bg-gray-700"
                        }`} />
                    )}
                  </For>
                </div>
              </div>

              {/* Body */}
              <div class="flex-1 overflow-y-auto p-6">
                {/* STEP 1: Fechas y búsqueda */}
                <Show when={createStep() === 1}>
                  <div class="space-y-4">
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Selecciona las fechas y busca disponibilidad
                    </p>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Fecha de entrada
                        </label>
                        <input
                          type="date"
                          class="input-field w-full"
                          min={todayStr()}
                          value={searchCheckIn()}
                          onInput={(e) => setSearchCheckIn(e.target.value)}
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Fecha de salida
                        </label>
                        <input
                          type="date"
                          class="input-field w-full"
                          min={searchCheckIn() || todayStr()}
                          value={searchCheckOut()}
                          onInput={(e) => setSearchCheckOut(e.target.value)}
                        />
                      </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Huéspedes
                        </label>
                        <input
                          type="number"
                          class="input-field w-full"
                          min="1"
                          value={searchGuests()}
                          onInput={(e) => setSearchGuests(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Tipo (opcional)
                        </label>
                        <select
                          class="input-field w-full"
                          value={searchType()}
                          onChange={(e) => setSearchType(e.target.value)}
                        >
                          <option value="">Todos los tipos</option>
                          <option value="Simple">Simple</option>
                          <option value="Doble">Doble</option>
                          <option value="Suite">Suite</option>
                          <option value="Deluxe">Deluxe</option>
                          <option value="Presidencial">Presidencial</option>
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={searchAvailability}
                      disabled={searchingRooms()}
                      class="btn-primary w-full disabled:opacity-50"
                    >
                      {searchingRooms() ? "Buscando..." : "🔍 Buscar disponibilidad"}
                    </button>

                    {/* Resultados */}
                    <Show when={availableRooms().length > 0}>
                      <p class="text-sm text-gray-500 dark:text-gray-400 mt-4">
                        {availableRooms().length} habitación(es) disponible(s).
                        Selecciona una para continuar:
                      </p>
                      <button
                        onClick={() => setCreateStep(2)}
                        class="btn-primary w-full mt-2"
                      >
                        Ver habitaciones disponibles →
                      </button>
                    </Show>
                  </div>
                </Show>

                {/* STEP 2: Seleccionar habitación */}
                <Show when={createStep() === 2}>
                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Selecciona una habitación
                      </p>
                      <button
                        onClick={() => setCreateStep(1)}
                        class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        ← Cambiar fechas
                      </button>
                    </div>

                    <div class="space-y-3">
                      <For each={availableRooms()}>
                        {(room) => (
                          <div
                            class="card cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                            onClick={() => selectRoom(room)}
                          >
                            <div class="flex items-center gap-4">
                              <Show when={room.images?.length > 0}>
                                <img
                                  src={`${BACKEND_URL}${room.images[0]}`}
                                  alt=""
                                  class="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                />
                              </Show>
                              <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                                    #{room.roomNumber} — {room.type}
                                  </p>
                                  <span class="text-xs text-gray-500 dark:text-gray-400">
                                    Piso {room.floor || "—"} • {room.capacity} persona(s)
                                  </span>
                                </div>
                                <Show when={room.amenities?.length > 0}>
                                  <div class="flex flex-wrap gap-1 mb-2">
                                    <For each={room.amenities.slice(0, 5)}>
                                      {(a) => (
                                        <span class="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                          {a}
                                        </span>
                                      )}
                                    </For>
                                  </div>
                                </Show>
                                <div class="flex items-center gap-3">
                                  <Show
                                    when={room.adjustedPrice && room.adjustedPrice !== room.basePrice}
                                    fallback={
                                      <p class="text-lg font-bold text-gray-900 dark:text-white">
                                        {formatPrice(room.basePrice)}
                                        <span class="text-xs font-normal text-gray-500"> /noche</span>
                                      </p>
                                    }
                                  >
                                    <p class="text-lg font-bold text-gray-900 dark:text-white">
                                      {formatPrice(room.adjustedPrice)}
                                      <span class="text-xs font-normal text-gray-500"> /noche</span>
                                    </p>
                                    <span class="text-xs line-through text-gray-400">
                                      {formatPrice(room.basePrice)}
                                    </span>
                                    <Show when={room.season}>
                                      <span class="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded">
                                        {room.season}
                                      </span>
                                    </Show>
                                  </Show>
                                </div>
                              </div>
                              <div class="flex-shrink-0">
                                <span class="text-xs px-3 py-1.5 rounded-md bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">
                                  Seleccionar →
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* STEP 3: Datos del cliente (solo staff) */}
                <Show when={createStep() === 3}>
                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Datos del cliente
                      </p>
                      <button
                        onClick={() => setCreateStep(2)}
                        class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        ← Cambiar habitación
                      </button>
                    </div>

                    <div class="card">
                      <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Si el cliente ya tiene cuenta, solo ingresa su email.
                        Si no existe, se creará automáticamente.
                      </p>
                      <div class="space-y-3">
                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email del cliente *
                          </label>
                          <input
                            type="email"
                            class="input-field w-full"
                            placeholder="cliente@email.com"
                            value={clientEmail()}
                            onInput={(e) => setClientEmail(e.target.value)}
                          />
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nombre del cliente
                          </label>
                          <input
                            type="text"
                            class="input-field w-full"
                            placeholder="Nombre completo (si es nuevo)"
                            value={clientName()}
                            onInput={(e) => setClientName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Teléfono
                          </label>
                          <input
                            type="tel"
                            class="input-field w-full"
                            placeholder="Opcional"
                            value={clientPhone()}
                            onInput={(e) => setClientPhone(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Solicitudes especiales
                      </label>
                      <textarea
                        class="input-field w-full"
                        rows="2"
                        placeholder="Cama extra, vista al mar, etc."
                        value={specialRequests()}
                        onInput={(e) => setSpecialRequests(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={() => setCreateStep(4)}
                      disabled={auth.hasPermission("reservations.create_others") && !clientEmail()}
                      class="btn-primary w-full disabled:opacity-50"
                    >
                      Continuar →
                    </button>
                  </div>
                </Show>

                {/* STEP 4 (o 3 para clientes): Confirmar */}
                <Show when={createStep() === 4 || (createStep() === 3 && !auth.hasPermission("reservations.create_others"))}>
                  <div class="space-y-4">
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirma los datos de la reserva
                    </p>

                    {/* Para clientes: solicitudes especiales */}
                    <Show when={!auth.hasPermission("reservations.create_others")}>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Solicitudes especiales (opcional)
                        </label>
                        <textarea
                          class="input-field w-full"
                          rows="2"
                          placeholder="Cama extra, vista al mar, etc."
                          value={specialRequests()}
                          onInput={(e) => setSpecialRequests(e.target.value)}
                        />
                      </div>
                    </Show>

                    <div class="card space-y-3">
                      <div class="grid grid-cols-2 gap-2 text-sm">
                        <p class="text-gray-500 dark:text-gray-400">Habitación:</p>
                        <p class="text-gray-900 dark:text-white font-medium">
                          #{selectedRoom()?.roomNumber} — {selectedRoom()?.type}
                        </p>

                        <p class="text-gray-500 dark:text-gray-400">Check-In:</p>
                        <p class="text-gray-900 dark:text-white">{formatDate(searchCheckIn())}</p>

                        <p class="text-gray-500 dark:text-gray-400">Check-Out:</p>
                        <p class="text-gray-900 dark:text-white">{formatDate(searchCheckOut())}</p>

                        <p class="text-gray-500 dark:text-gray-400">Noches:</p>
                        <p class="text-gray-900 dark:text-white">
                          {calculateNights(searchCheckIn(), searchCheckOut())}
                        </p>

                        <p class="text-gray-500 dark:text-gray-400">Huéspedes:</p>
                        <p class="text-gray-900 dark:text-white">{searchGuests()}</p>

                        <p class="text-gray-500 dark:text-gray-400">Precio/noche:</p>
                        <p class="text-gray-900 dark:text-white">
                          {formatPrice(selectedRoom()?.adjustedPrice || selectedRoom()?.basePrice)}
                        </p>

                        <Show when={clientEmail()}>
                          <p class="text-gray-500 dark:text-gray-400">Cliente:</p>
                          <p class="text-gray-900 dark:text-white">{clientEmail()}</p>
                        </Show>

                        <Show when={specialRequests()}>
                          <p class="text-gray-500 dark:text-gray-400">Solicitudes:</p>
                          <p class="text-gray-900 dark:text-white">{specialRequests()}</p>
                        </Show>
                      </div>

                      <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div class="flex justify-between items-center">
                          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Total estimado:</p>
                          <p class="text-xl font-bold text-gray-900 dark:text-white">
                            {formatPrice(
                              calculateNights(searchCheckIn(), searchCheckOut()) *
                              (selectedRoom()?.adjustedPrice || selectedRoom()?.basePrice || 0)
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div class="flex gap-3">
                      <button
                        onClick={() => setCreateStep(auth.hasPermission("reservations.create_others") ? 3 : 2)}
                        class="btn-secondary flex-1"
                      >
                        ← Atrás
                      </button>
                      <button
                        onClick={confirmReservation}
                        disabled={createLoading()}
                        class="btn-primary flex-1 disabled:opacity-50"
                      >
                        {createLoading() ? "Creando..." : "Confirmar Reserva"}
                      </button>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </Show>

        {/* ============================================ */}
        {/* MODAL: PAGO */}
        {/* ============================================ */}
        <Show when={showPaymentModal()}>
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-md shadow-xl">
              <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Registrar Pago
                </h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div class="p-6 space-y-4">
                {/* Info de la reserva */}
                <div class="card">
                  <p class="text-sm font-mono text-gray-900 dark:text-white">
                    {paymentReservation()?.reservationCode}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    #{paymentReservation()?.room?.roomNumber} — {paymentReservation()?.room?.type}
                  </p>
                  <p class="text-xl font-bold text-gray-900 dark:text-white mt-2">
                    {formatPrice(paymentReservation()?.totalAmount)}
                  </p>
                </div>

                {/* Método de pago */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Método de pago
                  </label>
                  <select
                    class="input-field w-full"
                    value={paymentMethod()}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <For each={PAYMENT_METHODS}>
                      {(m) => <option value={m.value}>{m.label}</option>}
                    </For>
                  </select>
                </div>

                {/* Tipo de comprobante */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de comprobante
                  </label>
                  <select
                    class="input-field w-full"
                    value={receiptType()}
                    onChange={(e) => setReceiptType(e.target.value)}
                  >
                    <For each={RECEIPT_TYPES}>
                      {(r) => <option value={r.value}>{r.label}</option>}
                    </For>
                  </select>
                </div>

                {/* Notas */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    class="input-field w-full"
                    rows="2"
                    placeholder="Notas del pago..."
                    value={paymentNotes()}
                    onInput={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>

                {/* Botones */}
                <div class="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    class="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submitPayment}
                    disabled={paymentLoading()}
                    class="btn-primary flex-1 disabled:opacity-50"
                  >
                    {paymentLoading() ? "Procesando..." : "Confirmar Pago"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* ============================================ */}
        {/* MODAL: CANCELAR RESERVA */}
        {/* ============================================ */}
        <Show when={showCancelModal()}>
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-md shadow-xl">
              <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 class="text-lg font-semibold text-red-600 dark:text-red-400">
                  Cancelar Reserva
                </h2>
                <button
                  onClick={() => setShowCancelModal(false)}
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div class="p-6 space-y-4">
                <div class="bg-red-500/10 border border-red-500/30 rounded-md p-4">
                  <p class="text-sm text-red-600 dark:text-red-400">
                    Estás a punto de cancelar la reserva
                    <strong> {cancelReservation()?.reservationCode}</strong>.
                    Esta acción puede generar una penalización según la política de cancelación.
                  </p>
                  <Show when={cancelReservation()?.paymentStatus === "pagado"}>
                    <p class="text-sm text-red-600 dark:text-red-400 mt-2">
                      Esta reserva ya fue pagada. Se procesará un reembolso automático
                      descontando la penalización correspondiente.
                    </p>
                  </Show>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Motivo de cancelación
                  </label>
                  <textarea
                    class="input-field w-full"
                    rows="3"
                    placeholder="Indica el motivo..."
                    value={cancelReason()}
                    onInput={(e) => setCancelReason(e.target.value)}
                  />
                </div>

                <div class="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    class="btn-secondary flex-1"
                  >
                    No, mantener
                  </button>
                  <button
                    onClick={submitCancel}
                    disabled={cancelLoading()}
                    class="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {cancelLoading() ? "Cancelando..." : "Sí, cancelar reserva"}
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

export default Reservations;