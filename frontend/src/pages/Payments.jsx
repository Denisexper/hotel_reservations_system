import { createSignal, createResource, Show, For } from "solid-js";
import { api } from "../services/api";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "@solidjs/router";
import { showToast } from "../utils/toast";
import Pagination from "../components/Pagination";

const PAYMENT_STATUSES = [
  { value: "completado", label: "Completado", color: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" },
  { value: "pendiente", label: "Pendiente", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" },
  { value: "fallido", label: "Fallido", color: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" },
  { value: "reembolsado", label: "Reembolsado", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
];

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
];

const RECEIPT_TYPES = {
  credito_fiscal: "Crédito Fiscal",
  consumidor_final: "Consumidor Final",
};

function Payments() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (!auth.hasPermission("payments.read")) {
    navigate("/dashboard");
    return null;
  }

  // Paginación
  const [currentPage, setCurrentPage] = createSignal(1);
  const [limit] = createSignal(10);

  // Filtros (inputs)
  const [statusInput, setStatusInput] = createSignal("");
  const [methodInput, setMethodInput] = createSignal("");
  const [startDateInput, setStartDateInput] = createSignal("");
  const [endDateInput, setEndDateInput] = createSignal("");

  // Filtros aplicados
  const [appliedFilters, setAppliedFilters] = createSignal({
    status: "",
    paymentMethod: "",
    startDate: "",
    endDate: "",
  });

  // Resource de pagos
  const [payments, { refetch }] = createResource(
    () => ({
      ...appliedFilters(),
      page: currentPage(),
      limit: limit(),
    }),
    (params) => {
      const filters = {};
      if (params.status) filters.status = params.status;
      if (params.paymentMethod) filters.paymentMethod = params.paymentMethod;
      if (params.startDate) filters.startDate = params.startDate;
      if (params.endDate) filters.endDate = params.endDate;
      filters.page = params.page;
      filters.limit = params.limit;
      return api.getPayments(filters);
    },
  );

  // Aplicar filtros
  const applyFilters = () => {
    setAppliedFilters({
      status: statusInput(),
      paymentMethod: methodInput(),
      startDate: startDateInput(),
      endDate: endDateInput(),
    });
    setCurrentPage(1);
  };

  // Limpiar filtros
  const clearFilters = () => {
    setStatusInput("");
    setMethodInput("");
    setStartDateInput("");
    setEndDateInput("");
    setAppliedFilters({
      status: "",
      paymentMethod: "",
      startDate: "",
      endDate: "",
    });
    setCurrentPage(1);
  };

  // ============================================
  // MODAL: Detalle de Pago
  // ============================================
  const [showDetail, setShowDetail] = createSignal(false);
  const [detailPayment, setDetailPayment] = createSignal(null);
  const [detailLoading, setDetailLoading] = createSignal(false);

  const openDetail = async (payment) => {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const result = await api.getPayment(payment._id);
      setDetailPayment(result.data);
    } catch (error) {
      showToast.error(error.message);
      setShowDetail(false);
    }
    setDetailLoading(false);
  };

  // ============================================
  // MODAL: Reembolso
  // ============================================
  const [showRefundModal, setShowRefundModal] = createSignal(false);
  const [refundPayment, setRefundPayment] = createSignal(null);
  const [refundReason, setRefundReason] = createSignal("");
  const [refundLoading, setRefundLoading] = createSignal(false);

  const openRefundModal = (payment) => {
    setRefundPayment(payment);
    setRefundReason("");
    setShowRefundModal(true);
  };

  const submitRefund = async () => {
    setRefundLoading(true);
    try {
      await api.refundPayment(refundPayment()._id, refundReason());
      showToast.success("Reembolso procesado correctamente");
      setShowRefundModal(false);
      refetch();
      // Si el detalle estaba abierto, cerrarlo
      if (showDetail()) setShowDetail(false);
    } catch (error) {
      showToast.error(error.message);
    }
    setRefundLoading(false);
  };

  // ============================================
  // Descargar comprobante PDF
  // ============================================
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
      showToast.success("Comprobante descargado");
    } catch (error) {
      showToast.error(error.message);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const getStatusInfo = (status) => {
    return PAYMENT_STATUSES.find((s) => s.value === status) || PAYMENT_STATUSES[1];
  };

  const getMethodLabel = (method) => {
    return PAYMENT_METHODS.find((m) => m.value === method)?.label || method;
  };

  const getReceiptLabel = (type) => {
    return RECEIPT_TYPES[type] || type;
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

  const formatDateTime = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-SV", {
      style: "currency",
      currency: "USD",
    }).format(price || 0);
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div class="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div class="flex justify-between items-center mb-8">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                Pagos
              </h1>
              <p class="text-gray-500 dark:text-gray-400 mt-1">
                Historial de transacciones y comprobantes
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div class="card mb-6">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Filtros</p>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Estado */}
              <select
                class="input-field"
                value={statusInput()}
                onChange={(e) => setStatusInput(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <For each={PAYMENT_STATUSES}>
                  {(s) => <option value={s.value}>{s.label}</option>}
                </For>
              </select>

              {/* Método de pago */}
              <select
                class="input-field"
                value={methodInput()}
                onChange={(e) => setMethodInput(e.target.value)}
              >
                <option value="">Todos los métodos</option>
                <For each={PAYMENT_METHODS}>
                  {(m) => <option value={m.value}>{m.label}</option>}
                </For>
              </select>

              {/* Fecha inicio */}
              <input
                type="date"
                class="input-field"
                value={startDateInput()}
                onInput={(e) => setStartDateInput(e.target.value)}
              />

              {/* Fecha fin */}
              <input
                type="date"
                class="input-field"
                value={endDateInput()}
                onInput={(e) => setEndDateInput(e.target.value)}
              />
            </div>

            <div class="flex gap-3 mt-4">
              <button onClick={applyFilters} class="btn-primary">
                🔍 Buscar
              </button>
              <button onClick={clearFilters} class="btn-secondary">
                ✕ Limpiar filtros
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div class="card overflow-hidden p-0">
            <Show when={payments.loading}>
              <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                Cargando pagos...
              </div>
            </Show>

            <Show when={payments.error}>
              <div class="p-8 text-center text-red-500">Error al cargar pagos</div>
            </Show>

            <Show when={payments()}>
              <Show
                when={payments()?.data?.length > 0}
                fallback={
                  <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron pagos
                  </div>
                }
              >
                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead>
                      <tr class="border-b border-gray-200 dark:border-gray-800">
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Transacción
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Reserva
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Monto
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Método
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Comprobante
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Estado
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th class="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={payments()?.data}>
                        {(payment) => {
                          const statusInfo = getStatusInfo(payment.status);
                          return (
                            <tr class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                              {/* Transacción */}
                              <td class="px-6 py-4">
                                <p class="text-sm font-mono font-medium text-gray-900 dark:text-white">
                                  {payment.transactionId}
                                </p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                  {payment.receiptNumber}
                                </p>
                              </td>

                              {/* Cliente */}
                              <td class="px-6 py-4">
                                <p class="text-sm text-gray-900 dark:text-white">
                                  {payment.reservation?.client?.name || "—"}
                                </p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                  {payment.reservation?.client?.email || ""}
                                </p>
                              </td>

                              {/* Reserva */}
                              <td class="px-6 py-4">
                                <p class="text-sm font-mono text-gray-700 dark:text-gray-300">
                                  {payment.reservation?.reservationCode || "—"}
                                </p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                  #{payment.reservation?.room?.roomNumber} {payment.reservation?.room?.type}
                                </p>
                              </td>

                              {/* Monto */}
                              <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                {formatPrice(payment.amount)}
                              </td>

                              {/* Método */}
                              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                {getMethodLabel(payment.paymentMethod)}
                              </td>

                              {/* Comprobante */}
                              <td class="px-6 py-4">
                                <span class="text-xs text-gray-600 dark:text-gray-400">
                                  {getReceiptLabel(payment.receiptType)}
                                </span>
                              </td>

                              {/* Estado */}
                              <td class="px-6 py-4">
                                <span class={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                              </td>

                              {/* Fecha */}
                              <td class="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(payment.paymentDate)}
                              </td>

                              {/* Acciones */}
                              <td class="px-6 py-4">
                                <div class="flex items-center gap-2 justify-end">
                                  {/* Ver detalle */}
                                  <button
                                    onClick={() => openDetail(payment)}
                                    class="text-xs px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                                  >
                                    Detalle
                                  </button>

                                  {/* Descargar comprobante */}
                                  <Show when={payment.status === "completado"}>
                                    <button
                                      onClick={() => downloadReceipt(payment._id)}
                                      class="text-xs px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                    >
                                      PDF
                                    </button>
                                  </Show>

                                  {/* Reembolsar */}
                                  <Show when={payment.status === "completado" && auth.hasPermission("payments.update")}>
                                    <button
                                      onClick={() => openRefundModal(payment)}
                                      class="text-xs px-3 py-1.5 rounded-md border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                    >
                                      Reembolsar
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

                {/* Paginación */}
                <Show when={payments()?.pagination}>
                  <Pagination
                    currentPage={currentPage()}
                    totalPages={payments().pagination.totalPages}
                    onPageChange={(p) => setCurrentPage(p)}
                  />
                </Show>
              </Show>
            </Show>
          </div>
        </div>

        {/* ============================================ */}
        {/* MODAL: DETALLE DE PAGO */}
        {/* ============================================ */}
        <Show when={showDetail()}>
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
              <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Detalle del Pago
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
                    <div class="text-center py-8 text-gray-500 dark:text-gray-400">Cargando...</div>
                  }
                >
                  <Show when={detailPayment()}>
                    {(pay) => {
                      const p = pay();
                      const statusInfo = getStatusInfo(p.status);
                      const reservation = p.reservation;
                      return (
                        <div class="space-y-6">
                          {/* Header */}
                          <div class="flex items-center justify-between">
                            <div>
                              <p class="text-lg font-mono font-bold text-gray-900 dark:text-white">
                                {p.transactionId}
                              </p>
                              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {p.receiptNumber}
                              </p>
                              <span class={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            <div class="text-right">
                              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatPrice(p.amount)}
                              </p>
                            </div>
                          </div>

                          {/* Datos del pago */}
                          <div class="card">
                            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                              Información del Pago
                            </p>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                              <p class="text-gray-500 dark:text-gray-400">Método:</p>
                              <p class="text-gray-900 dark:text-white">{getMethodLabel(p.paymentMethod)}</p>

                              <p class="text-gray-500 dark:text-gray-400">Tipo comprobante:</p>
                              <p class="text-gray-900 dark:text-white">{getReceiptLabel(p.receiptType)}</p>

                              <p class="text-gray-500 dark:text-gray-400">Fecha de pago:</p>
                              <p class="text-gray-900 dark:text-white">{formatDateTime(p.paymentDate)}</p>

                              <Show when={p.notes}>
                                <p class="text-gray-500 dark:text-gray-400">Notas:</p>
                                <p class="text-gray-900 dark:text-white">{p.notes}</p>
                              </Show>
                            </div>
                          </div>

                          {/* Procesado por */}
                          <Show when={p.processedBy}>
                            <div class="card">
                              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                                Procesado por
                              </p>
                              <p class="text-sm font-medium text-gray-900 dark:text-white">
                                {p.processedBy.name}
                              </p>
                              <p class="text-sm text-gray-500 dark:text-gray-400">
                                {p.processedBy.email}
                              </p>
                            </div>
                          </Show>

                          {/* Datos de la reserva */}
                          <Show when={reservation}>
                            <div class="card">
                              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                                Reserva Asociada
                              </p>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <p class="text-gray-500 dark:text-gray-400">Código:</p>
                                <p class="text-gray-900 dark:text-white font-mono">{reservation.reservationCode}</p>

                                <p class="text-gray-500 dark:text-gray-400">Habitación:</p>
                                <p class="text-gray-900 dark:text-white">
                                  #{reservation.room?.roomNumber} — {reservation.room?.type}
                                </p>

                                <p class="text-gray-500 dark:text-gray-400">Check-In:</p>
                                <p class="text-gray-900 dark:text-white">{formatDate(reservation.checkIn)}</p>

                                <p class="text-gray-500 dark:text-gray-400">Check-Out:</p>
                                <p class="text-gray-900 dark:text-white">{formatDate(reservation.checkOut)}</p>

                                <p class="text-gray-500 dark:text-gray-400">Total reserva:</p>
                                <p class="text-gray-900 dark:text-white">{formatPrice(reservation.totalAmount)}</p>
                              </div>
                            </div>

                            {/* Datos del cliente */}
                            <Show when={reservation.client}>
                              <div class="card">
                                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                                  Cliente
                                </p>
                                <p class="text-sm font-medium text-gray-900 dark:text-white">
                                  {reservation.client.name}
                                </p>
                                <p class="text-sm text-gray-500 dark:text-gray-400">
                                  {reservation.client.email}
                                </p>
                                <Show when={reservation.client.phone}>
                                  <p class="text-sm text-gray-500 dark:text-gray-400">
                                    {reservation.client.phone}
                                  </p>
                                </Show>
                              </div>
                            </Show>
                          </Show>

                          {/* Acciones del detalle */}
                          <div class="flex gap-2 flex-wrap pt-2">
                            <Show when={p.status === "completado"}>
                              <button
                                onClick={() => downloadReceipt(p._id)}
                                class="btn-primary"
                              >
                                Descargar Comprobante
                              </button>
                            </Show>
                            <Show when={p.status === "completado" && auth.hasPermission("payments.update")}>
                              <button
                                onClick={() => {
                                  setShowDetail(false);
                                  openRefundModal(p);
                                }}
                                class="btn-secondary text-red-600 dark:text-red-400"
                              >
                                Reembolsar
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
        {/* MODAL: REEMBOLSO */}
        {/* ============================================ */}
        <Show when={showRefundModal()}>
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-md shadow-xl">
              <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 class="text-lg font-semibold text-red-600 dark:text-red-400">
                  Reembolsar Pago
                </h2>
                <button
                  onClick={() => setShowRefundModal(false)}
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div class="p-6 space-y-4">
                <div class="bg-red-500/10 border border-red-500/30 rounded-md p-4">
                  <p class="text-sm text-red-600 dark:text-red-400">
                    Estás a punto de reembolsar el pago
                    <strong> {refundPayment()?.transactionId}</strong> por un monto de
                    <strong> {formatPrice(refundPayment()?.amount)}</strong>.
                    Esta acción también actualizará el estado de pago de la reserva asociada.
                  </p>
                </div>

                {/* Info del pago */}
                <div class="card">
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <p class="text-gray-500 dark:text-gray-400">Transacción:</p>
                    <p class="text-gray-900 dark:text-white font-mono">{refundPayment()?.transactionId}</p>

                    <p class="text-gray-500 dark:text-gray-400">Reserva:</p>
                    <p class="text-gray-900 dark:text-white font-mono">
                      {refundPayment()?.reservation?.reservationCode || "—"}
                    </p>

                    <p class="text-gray-500 dark:text-gray-400">Cliente:</p>
                    <p class="text-gray-900 dark:text-white">
                      {refundPayment()?.reservation?.client?.name || "—"}
                    </p>

                    <p class="text-gray-500 dark:text-gray-400">Monto:</p>
                    <p class="text-gray-900 dark:text-white font-medium">
                      {formatPrice(refundPayment()?.amount)}
                    </p>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Razón del reembolso
                  </label>
                  <textarea
                    class="input-field w-full"
                    rows="3"
                    placeholder="Indica el motivo del reembolso..."
                    value={refundReason()}
                    onInput={(e) => setRefundReason(e.target.value)}
                  />
                </div>

                <div class="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowRefundModal(false)}
                    class="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submitRefund}
                    disabled={refundLoading()}
                    class="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {refundLoading() ? "Procesando..." : "Confirmar Reembolso"}
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

export default Payments;