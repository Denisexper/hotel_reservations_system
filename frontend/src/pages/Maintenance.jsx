import { createSignal, createResource, Show, For } from "solid-js";
import { api } from "../services/api";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "@solidjs/router";
import { showToast } from "../utils/toast";
import Pagination from "../components/Pagination";

const PRIORITIES = [
    { value: "baja", label: "Baja", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
    { value: "media", label: "Media", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" },
    { value: "alta", label: "Alta", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400" },
    { value: "urgente", label: "Urgente", color: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" },
];

const STATUSES = [
    { value: "reportado", label: "Reportado", color: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" },
    { value: "en_proceso", label: "En Proceso", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" },
    { value: "resuelto", label: "Resuelto", color: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" },
];

function Maintenance() {
    const auth = useAuth();
    const navigate = useNavigate();

    if (!auth.hasPermission("maintenance.read")) {
        navigate("/dashboard");
        return null;
    }

    // Paginación
    const [currentPage, setCurrentPage] = createSignal(1);
    const [limit] = createSignal(10);

    // Filtros
    const [statusFilter, setStatusFilter] = createSignal("");
    const [priorityFilter, setPriorityFilter] = createSignal("");
    const [appliedFilters, setAppliedFilters] = createSignal({ status: "", priority: "" });

    // Resource
    const [tickets, { refetch }] = createResource(
        () => ({ ...appliedFilters(), page: currentPage(), limit: limit() }),
        (params) => {
            const filters = { page: params.page, limit: params.limit };
            if (params.status) filters.status = params.status;
            if (params.priority) filters.priority = params.priority;
            return api.getMaintenanceTickets(filters);
        },
    );

    const applyFilters = () => {
        setAppliedFilters({ status: statusFilter(), priority: priorityFilter() });
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setStatusFilter("");
        setPriorityFilter("");
        setAppliedFilters({ status: "", priority: "" });
        setCurrentPage(1);
    };

    // Habitaciones para el select de crear
    const [roomsList] = createResource(() => api.getRooms({ limit: 100 }));

    // ============================================
    // MODAL: Crear Ticket
    // ============================================
    const [showCreateModal, setShowCreateModal] = createSignal(false);
    const [createLoading, setCreateLoading] = createSignal(false);
    const [createError, setCreateError] = createSignal("");
    const [formRoom, setFormRoom] = createSignal("");
    const [formIssue, setFormIssue] = createSignal("");
    const [formPriority, setFormPriority] = createSignal("media");
    const [formNotes, setFormNotes] = createSignal("");

    const openCreateModal = () => {
        setFormRoom("");
        setFormIssue("");
        setFormPriority("media");
        setFormNotes("");
        setCreateError("");
        setShowCreateModal(true);
    };

    const submitCreate = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateError("");
        try {
            await api.createMaintenanceTicket({
                room: formRoom(),
                issue: formIssue(),
                priority: formPriority(),
                notes: formNotes() || undefined,
            });
            showToast.success("Ticket creado. Habitación marcada en mantenimiento.");
            setShowCreateModal(false);
            refetch();
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
    const [detailTicket, setDetailTicket] = createSignal(null);
    const [detailLoading, setDetailLoading] = createSignal(false);

    const openDetail = async (ticket) => {
        setDetailLoading(true);
        setShowDetail(true);
        try {
            const result = await api.getMaintenanceTicket(ticket._id);
            setDetailTicket(result.data);
        } catch (error) {
            showToast.error(error.message);
            setShowDetail(false);
        }
        setDetailLoading(false);
    };

    // ============================================
    // MODAL: Cambiar Estado
    // ============================================
    const [showStatusModal, setShowStatusModal] = createSignal(false);
    const [statusTicket, setStatusTicket] = createSignal(null);
    const [newStatus, setNewStatus] = createSignal("en_proceso");
    const [statusNotes, setStatusNotes] = createSignal("");
    const [statusLoading, setStatusLoading] = createSignal(false);

    const openStatusModal = (ticket) => {
        setStatusTicket(ticket);
        setNewStatus(ticket.status === "reportado" ? "en_proceso" : "resuelto");
        setStatusNotes("");
        setShowStatusModal(true);
    };

    const submitStatusChange = async () => {
        setStatusLoading(true);
        try {
            const data = { status: newStatus() };
            if (statusNotes()) data.notes = statusNotes();
            await api.updateMaintenanceTicket(statusTicket()._id, data);
            showToast.success(
                newStatus() === "resuelto"
                    ? "Ticket resuelto. Habitación disponible."
                    : "Estado actualizado correctamente",
            );
            setShowStatusModal(false);
            refetch();
        } catch (error) {
            showToast.error(error.message);
        }
        setStatusLoading(false);
    };

    // ============================================
    // Eliminar
    // ============================================
    const handleDelete = (ticket) => {
        showToast.confirm(
            `¿Eliminar el ticket de la habitación #${ticket.room?.roomNumber}?`,
            async () => {
                try {
                    await api.deleteMaintenanceTicket(ticket._id);
                    showToast.success("Ticket eliminado");
                    refetch();
                } catch (error) {
                    showToast.error(error.message);
                }
            },
        );
    };

    // ============================================
    // HELPERS
    // ============================================
    const getPriorityInfo = (priority) => PRIORITIES.find((p) => p.value === priority) || PRIORITIES[1];
    const getStatusInfo = (status) => STATUSES.find((s) => s.value === status) || STATUSES[0];

    const formatDate = (date) => {
        if (!date) return "—";
        const d = typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)
            ? new Date(date + "T12:00:00")
            : new Date(date);
        return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    };

    const formatDateTime = (date) => {
        if (!date) return "—";
        return new Date(date).toLocaleString("es-ES", {
            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
        });
    };

    const roomLabel = (room) => {
        if (!room) return "—";
        return `#${room.roomNumber} — ${room.type} (Piso ${room.floor || "—"})`;
    };

    return (
        <ProtectedRoute>
            <Layout>
                <div class="p-8 max-w-7xl mx-auto">
                    {/* Header */}
                    <div class="flex justify-between items-center mb-8">
                        <div>
                            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Mantenimiento</h1>
                            <p class="text-gray-500 dark:text-gray-400 mt-1">Gestión de tickets de mantenimiento</p>
                        </div>
                        <Show when={auth.hasPermission("maintenance.create")}>
                            <button onClick={openCreateModal} class="btn-primary">
                                + Nuevo Ticket
                            </button>
                        </Show>
                    </div>

                    {/* Filtros */}
                    <div class="card mb-6">
                        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Filtros</p>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <select class="input-field" value={statusFilter()} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="">Todos los estados</option>
                                <For each={STATUSES}>{(s) => <option value={s.value}>{s.label}</option>}</For>
                            </select>
                            <select class="input-field" value={priorityFilter()} onChange={(e) => setPriorityFilter(e.target.value)}>
                                <option value="">Todas las prioridades</option>
                                <For each={PRIORITIES}>{(p) => <option value={p.value}>{p.label}</option>}</For>
                            </select>
                            <div class="flex gap-3">
                                <button onClick={applyFilters} class="btn-primary">🔍 Buscar</button>
                                <button onClick={clearFilters} class="btn-secondary">✕ Limpiar</button>
                            </div>
                        </div>
                    </div>

                    {/* Tabla */}
                    <div class="card overflow-hidden p-0">
                        <Show when={tickets.loading}>
                            <div class="p-8 text-center text-gray-500 dark:text-gray-400">Cargando tickets...</div>
                        </Show>
                        <Show when={tickets.error}>
                            <div class="p-8 text-center text-red-500">Error al cargar tickets</div>
                        </Show>
                        <Show when={tickets()}>
                            <Show
                                when={tickets()?.data?.length > 0}
                                fallback={<div class="p-8 text-center text-gray-500 dark:text-gray-400">No se encontraron tickets</div>}
                            >
                                <div class="overflow-x-auto">
                                    <table class="w-full">
                                        <thead>
                                            <tr class="border-b border-gray-200 dark:border-gray-800">
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Habitación</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Problema</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prioridad</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reportado por</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resuelto por</th>
                                                <th class="px-6 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <For each={tickets()?.data}>
                                                {(ticket) => {
                                                    const priorityInfo = getPriorityInfo(ticket.priority);
                                                    const statusInfo = getStatusInfo(ticket.status);
                                                    return (
                                                        <tr class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                                            <td class="px-6 py-4">
                                                                <p class="text-sm font-medium text-gray-900 dark:text-white">
                                                                    #{ticket.room?.roomNumber} — {ticket.room?.type}
                                                                </p>
                                                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                                                    Piso {ticket.room?.floor || "—"}
                                                                </p>
                                                            </td>
                                                            <td class="px-6 py-4">
                                                                <p class="text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                                                                    {ticket.issue}
                                                                </p>
                                                            </td>
                                                            <td class="px-6 py-4">
                                                                <span class={`px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.color}`}>
                                                                    {priorityInfo.label}
                                                                </span>
                                                            </td>
                                                            <td class="px-6 py-4">
                                                                <span class={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                                                    {statusInfo.label}
                                                                </span>
                                                            </td>
                                                            <td class="px-6 py-4">
                                                                <p class="text-sm text-gray-900 dark:text-white">{ticket.reportedBy?.name || "—"}</p>
                                                                <p class="text-xs text-gray-500 dark:text-gray-400">{ticket.reportedBy?.email || ""}</p>
                                                            </td>
                                                            <td class="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                                                                {formatDate(ticket.createdAt)}
                                                            </td>
                                                            <td class="px-6 py-4">
                                                                <Show when={ticket.resolvedBy} fallback={<span class="text-xs text-gray-400">—</span>}>
                                                                    <p class="text-sm text-gray-900 dark:text-white">{ticket.resolvedBy?.name}</p>
                                                                    <p class="text-xs text-gray-500 dark:text-gray-400">{formatDate(ticket.resolvedAt)}</p>
                                                                </Show>
                                                            </td>
                                                            <td class="px-6 py-4">
                                                                <div class="flex items-center gap-2 justify-end">
                                                                    <button
                                                                        onClick={() => openDetail(ticket)}
                                                                        class="text-xs px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                                                                    >
                                                                        Detalle
                                                                    </button>
                                                                    <Show when={ticket.status !== "resuelto" && auth.hasPermission("maintenance.update")}>
                                                                        <button
                                                                            onClick={() => openStatusModal(ticket)}
                                                                            class="text-xs px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                                                        >
                                                                            Cambiar estado
                                                                        </button>
                                                                    </Show>
                                                                    <Show when={auth.hasPermission("maintenance.delete")}>
                                                                        <button
                                                                            onClick={() => handleDelete(ticket)}
                                                                            class="text-xs px-3 py-1.5 rounded-md border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                                        >
                                                                            Eliminar
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
                                <Show when={tickets()?.pagination}>
                                    <Pagination
                                        currentPage={currentPage()}
                                        totalPages={tickets().pagination.totalPages}
                                        onPageChange={(p) => setCurrentPage(p)}
                                    />
                                </Show>
                            </Show>
                        </Show>
                    </div>
                </div>

                {/* ============================================ */}
                {/* MODAL: CREAR TICKET */}
                {/* ============================================ */}
                <Show when={showCreateModal()}>
                    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-lg shadow-xl">
                            <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Nuevo Ticket de Mantenimiento</h2>
                                <button onClick={() => setShowCreateModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                            </div>
                            <form onSubmit={submitCreate} class="p-6 space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Habitación</label>
                                    <select class="input-field w-full" value={formRoom()} onChange={(e) => setFormRoom(e.target.value)} required>
                                        <option value="">Seleccionar habitación</option>
                                        <Show when={roomsList()?.data}>
                                            <For each={roomsList().data}>
                                                {(room) => (
                                                    <option value={room._id}>#{room.roomNumber} — {room.type} (Piso {room.floor || "—"})</option>
                                                )}
                                            </For>
                                        </Show>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción del problema</label>
                                    <textarea
                                        class="input-field w-full" rows="3" required maxlength="500"
                                        placeholder="Describe el problema encontrado..."
                                        value={formIssue()} onInput={(e) => setFormIssue(e.target.value)}
                                    />
                                    <p class="text-xs text-gray-400 mt-1">{formIssue().length}/500</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridad</label>
                                    <select class="input-field w-full" value={formPriority()} onChange={(e) => setFormPriority(e.target.value)} required>
                                        <For each={PRIORITIES}>{(p) => <option value={p.value}>{p.label}</option>}</For>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas adicionales (opcional)</label>
                                    <textarea
                                        class="input-field w-full" rows="2" maxlength="500"
                                        placeholder="Notas adicionales..."
                                        value={formNotes()} onInput={(e) => setFormNotes(e.target.value)}
                                    />
                                </div>
                                <Show when={createError()}>
                                    <div class="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">{createError()}</div>
                                </Show>
                                <div class="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowCreateModal(false)} class="btn-secondary flex-1">Cancelar</button>
                                    <button type="submit" disabled={createLoading()} class="btn-primary flex-1 disabled:opacity-50">
                                        {createLoading() ? "Creando..." : "Crear Ticket"}
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
                                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Detalle del Ticket</h2>
                                <button onClick={() => setShowDetail(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                            </div>
                            <div class="flex-1 overflow-y-auto p-6">
                                <Show when={!detailLoading()} fallback={<div class="text-center py-8 text-gray-500 dark:text-gray-400">Cargando...</div>}>
                                    <Show when={detailTicket()}>
                                        {(t) => {
                                            const ticket = t();
                                            const priorityInfo = getPriorityInfo(ticket.priority);
                                            const statusInfo = getStatusInfo(ticket.status);
                                            return (
                                                <div class="space-y-6">
                                                    {/* Header */}
                                                    <div class="flex items-center gap-3">
                                                        <span class={`px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.color}`}>{priorityInfo.label}</span>
                                                        <span class={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                                                    </div>

                                                    {/* Habitación */}
                                                    <div class="card">
                                                        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Habitación</p>
                                                        <p class="text-sm font-medium text-gray-900 dark:text-white">{roomLabel(ticket.room)}</p>
                                                        <Show when={ticket.room?.status}>
                                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                Estado actual: {ticket.room.status}
                                                            </p>
                                                        </Show>
                                                    </div>

                                                    {/* Problema */}
                                                    <div class="card">
                                                        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Problema Reportado</p>
                                                        <p class="text-sm text-gray-900 dark:text-white">{ticket.issue}</p>
                                                    </div>

                                                    {/* Reportado por */}
                                                    <div class="card">
                                                        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Reportado por</p>
                                                        <p class="text-sm font-medium text-gray-900 dark:text-white">{ticket.reportedBy?.name}</p>
                                                        <p class="text-sm text-gray-500 dark:text-gray-400">{ticket.reportedBy?.email}</p>
                                                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDateTime(ticket.createdAt)}</p>
                                                    </div>

                                                    {/* Notas */}
                                                    <Show when={ticket.notes}>
                                                        <div class="card">
                                                            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Notas</p>
                                                            <p class="text-sm text-gray-900 dark:text-white">{ticket.notes}</p>
                                                        </div>
                                                    </Show>

                                                    {/* Resolución */}
                                                    <Show when={ticket.status === "resuelto" && ticket.resolvedBy}>
                                                        <div class="card border-l-4 border-l-green-500">
                                                            <p class="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-2">Resolución</p>
                                                            <p class="text-sm font-medium text-gray-900 dark:text-white">{ticket.resolvedBy?.name}</p>
                                                            <p class="text-sm text-gray-500 dark:text-gray-400">{ticket.resolvedBy?.email}</p>
                                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDateTime(ticket.resolvedAt)}</p>
                                                        </div>
                                                    </Show>

                                                    {/* Acciones */}
                                                    <div class="flex gap-2 flex-wrap pt-2">
                                                        <Show when={ticket.status !== "resuelto" && auth.hasPermission("maintenance.update")}>
                                                            <button
                                                                onClick={() => { setShowDetail(false); openStatusModal(ticket); }}
                                                                class="btn-primary"
                                                            >
                                                                Cambiar Estado
                                                            </button>
                                                        </Show>
                                                        <Show when={auth.hasPermission("maintenance.delete")}>
                                                            <button
                                                                onClick={() => { setShowDetail(false); handleDelete(ticket); }}
                                                                class="btn-secondary text-red-600 dark:text-red-400"
                                                            >
                                                                Eliminar
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
                                <button onClick={() => setShowDetail(false)} class="btn-secondary w-full">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </Show>

                {/* ============================================ */}
                {/* MODAL: CAMBIAR ESTADO */}
                {/* ============================================ */}
                <Show when={showStatusModal()}>
                    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-md shadow-xl">
                            <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Cambiar Estado</h2>
                                <button onClick={() => setShowStatusModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                            </div>
                            <div class="p-6 space-y-4">
                                <div class="card">
                                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                                        {roomLabel(statusTicket()?.room)}
                                    </p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                        {statusTicket()?.issue}
                                    </p>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nuevo estado</label>
                                    <select class="input-field w-full" value={newStatus()} onChange={(e) => setNewStatus(e.target.value)}>
                                        <Show when={statusTicket()?.status === "reportado"}>
                                            <option value="en_proceso">En Proceso</option>
                                        </Show>
                                        <option value="resuelto">Resuelto</option>
                                    </select>
                                </div>

                                <Show when={newStatus() === "resuelto"}>
                                    <div class="bg-green-500/10 border border-green-500/30 rounded-md p-3">
                                        <p class="text-xs text-green-600 dark:text-green-400">
                                            Al marcar como resuelto, si no hay más tickets abiertos para esta habitación,
                                            volverá a estado "disponible" automáticamente.
                                        </p>
                                    </div>
                                </Show>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas (opcional)</label>
                                    <textarea
                                        class="input-field w-full" rows="2"
                                        placeholder="Notas sobre el cambio..."
                                        value={statusNotes()} onInput={(e) => setStatusNotes(e.target.value)}
                                    />
                                </div>

                                <div class="flex gap-3 pt-2">
                                    <button onClick={() => setShowStatusModal(false)} class="btn-secondary flex-1">Cancelar</button>
                                    <button
                                        onClick={submitStatusChange}
                                        disabled={statusLoading()}
                                        class="btn-primary flex-1 disabled:opacity-50"
                                    >
                                        {statusLoading() ? "Actualizando..." : "Confirmar"}
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

export default Maintenance;