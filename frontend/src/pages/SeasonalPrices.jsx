import { createSignal, createResource, Show, For } from "solid-js";
import { api } from "../services/api";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "@solidjs/router";
import { showToast } from "../utils/toast";
import Pagination from "../components/Pagination";

const ROOM_TYPES = ["todas", "Simple", "Doble", "Suite", "Deluxe", "Presidencial", "Single", "Triple", "Twin"];
const MODIFIER_TYPES = [
    { value: "porcentaje", label: "Porcentaje" },
    { value: "fijo", label: "Monto Fijo" },
];

function SeasonalPrices() {
    const auth = useAuth();
    const navigate = useNavigate();

    if (!auth.hasPermission("rooms.read")) {
        navigate("/dashboard");
        return null;
    }

    // Paginación
    const [currentPage, setCurrentPage] = createSignal(1);
    const [limit] = createSignal(10);

    // Filtro
    const [statusFilter, setStatusFilter] = createSignal("");
    const [appliedStatus, setAppliedStatus] = createSignal("");

    // Resource
    const [seasons, { refetch }] = createResource(
        () => ({
            isActive: appliedStatus(),
            page: currentPage(),
            limit: limit(),
        }),
        (params) => {
            const filters = { page: params.page, limit: params.limit };
            if (params.isActive !== "") filters.isActive = params.isActive;
            return api.getSeasonalPrices(filters);
        },
    );

    const applyFilters = () => {
        setAppliedStatus(statusFilter());
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setStatusFilter("");
        setAppliedStatus("");
        setCurrentPage(1);
    };

    // ============================================
    // MODAL CRUD
    // ============================================
    const [showModal, setShowModal] = createSignal(false);
    const [editingSeason, setEditingSeason] = createSignal(null);
    const [modalLoading, setModalLoading] = createSignal(false);
    const [modalError, setModalError] = createSignal("");

    const [formName, setFormName] = createSignal("");
    const [formStartDate, setFormStartDate] = createSignal("");
    const [formEndDate, setFormEndDate] = createSignal("");
    const [formModifierType, setFormModifierType] = createSignal("porcentaje");
    const [formModifierValue, setFormModifierValue] = createSignal(0);
    const [formRoomType, setFormRoomType] = createSignal("todas");

    const openCreate = () => {
        setEditingSeason(null);
        setFormName("");
        setFormStartDate("");
        setFormEndDate("");
        setFormModifierType("porcentaje");
        setFormModifierValue(0);
        setFormRoomType("todas");
        setModalError("");
        setShowModal(true);
    };

    const openEdit = (season) => {
        setEditingSeason(season);
        setFormName(season.seasonName);
        setFormStartDate(season.startDate?.split("T")[0] || "");
        setFormEndDate(season.endDate?.split("T")[0] || "");
        setFormModifierType(season.modifierType);
        setFormModifierValue(season.modifierValue);
        setFormRoomType(season.roomType);
        setModalError("");
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        setModalError("");

        try {
            const data = {
                seasonName: formName(),
                startDate: formStartDate(),
                endDate: formEndDate(),
                modifierType: formModifierType(),
                modifierValue: Number(formModifierValue()),
                roomType: formRoomType(),
            };

            if (editingSeason()) {
                await api.updateSeasonalPrice(editingSeason()._id, data);
                showToast.success("Temporada actualizada correctamente");
            } else {
                await api.createSeasonalPrice(data);
                showToast.success("Temporada creada exitosamente");
            }

            setShowModal(false);
            refetch();
        } catch (error) {
            setModalError(error.message);
            showToast.error(error.message);
        }
        setModalLoading(false);
    };

    // ============================================
    // DESACTIVAR / REACTIVAR
    // ============================================
    const handleToggleStatus = (season) => {
        const action = season.isActive ? "desactivar" : "reactivar";
        showToast.confirm(
            `¿${season.isActive ? "Desactivar" : "Reactivar"} la temporada "${season.seasonName}"?`,
            async () => {
                try {
                    if (season.isActive) {
                        await api.deleteSeasonalPrice(season._id);
                        showToast.success("Temporada desactivada");
                    } else {
                        await api.updateSeasonalPrice(season._id, { isActive: true });
                        showToast.success("Temporada reactivada");
                    }
                    refetch();
                } catch (error) {
                    showToast.error(error.message);
                }
            },
        );
    };

    // ============================================
    // SIMULADOR DE PRECIO
    // ============================================
    const [showSimulator, setShowSimulator] = createSignal(false);
    const [simRoomId, setSimRoomId] = createSignal("");
    const [simCheckIn, setSimCheckIn] = createSignal("");
    const [simLoading, setSimLoading] = createSignal(false);
    const [simResult, setSimResult] = createSignal(null);

    // Cargar habitaciones para el simulador
    const [roomsList] = createResource(() => api.getRooms({ limit: 100 }));

    const simulatePrice = async () => {
        if (!simRoomId() || !simCheckIn()) {
            showToast.error("Selecciona una habitación y una fecha");
            return;
        }
        setSimLoading(true);
        setSimResult(null);
        try {
            const result = await api.checkSeasonalPrice(simRoomId(), simCheckIn());
            setSimResult(result.data);
        } catch (error) {
            showToast.error(error.message);
        }
        setSimLoading(false);
    };

    // ============================================
    // HELPERS
    // ============================================
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

    const formatModifier = (type, value) => {
        if (type === "porcentaje") return `+${value}%`;
        return `+${formatPrice(value)}`;
    };

    const modifierLabel = (type) => {
        return type === "porcentaje" ? "Porcentaje" : "Monto Fijo";
    };

    const roomTypeLabel = (type) => {
        return type === "todas" ? "Todas" : type;
    };

    return (
        <ProtectedRoute>
            <Layout>
                <div class="p-8 max-w-7xl mx-auto">
                    {/* Header */}
                    <div class="flex justify-between items-center mb-8">
                        <div>
                            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                                Temporadas de Precios
                            </h1>
                            <p class="text-gray-500 dark:text-gray-400 mt-1">
                                Gestiona los ajustes de precios por temporada
                            </p>
                        </div>
                        <div class="flex gap-2">
                            {/* Simulador toggle */}
                            <button
                                onClick={() => setShowSimulator(!showSimulator())}
                                class="btn-secondary"
                            >
                                {showSimulator() ? "Ocultar Simulador" : "Simulador de Precio"}
                            </button>
                            <Show when={auth.hasPermission("rooms.create")}>
                                <button onClick={openCreate} class="btn-primary">
                                    + Nueva temporada
                                </button>
                            </Show>
                        </div>
                    </div>

                    {/* ============================================ */}
                    {/* SIMULADOR DE PRECIO */}
                    {/* ============================================ */}
                    <Show when={showSimulator()}>
                        <div class="card mb-6 border-l-4 border-l-blue-500">
                            <p class="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                Simulador de Precio por Temporada
                            </p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                Verifica cómo afectan las temporadas al precio de una habitación en una fecha específica.
                            </p>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Habitación
                                    </label>
                                    <select
                                        class="input-field w-full"
                                        value={simRoomId()}
                                        onChange={(e) => setSimRoomId(e.target.value)}
                                    >
                                        <option value="">Seleccionar habitación</option>
                                        <Show when={roomsList()?.data}>
                                            <For each={roomsList().data}>
                                                {(room) => (
                                                    <option value={room._id}>
                                                        #{room.roomNumber} — {room.type} ({formatPrice(room.basePrice)})
                                                    </option>
                                                )}
                                            </For>
                                        </Show>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Fecha de check-in
                                    </label>
                                    <input
                                        type="date"
                                        class="input-field w-full"
                                        value={simCheckIn()}
                                        onInput={(e) => setSimCheckIn(e.target.value)}
                                    />
                                </div>
                                <div class="flex items-end">
                                    <button
                                        onClick={simulatePrice}
                                        disabled={simLoading()}
                                        class="btn-primary w-full disabled:opacity-50"
                                    >
                                        {simLoading() ? "Consultando..." : "Consultar Precio"}
                                    </button>
                                </div>
                            </div>

                            {/* Resultado */}
                            <Show when={simResult()}>
                                <div class="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p class="text-xs text-gray-500 dark:text-gray-400">Habitación</p>
                                            <p class="text-sm font-medium text-gray-900 dark:text-white">
                                                #{simResult().roomNumber} — {simResult().roomType}
                                            </p>
                                        </div>
                                        <div>
                                            <p class="text-xs text-gray-500 dark:text-gray-400">Precio Base</p>
                                            <p class="text-sm font-medium text-gray-900 dark:text-white">
                                                {formatPrice(simResult().basePrice)}
                                            </p>
                                        </div>
                                        <div>
                                            <p class="text-xs text-gray-500 dark:text-gray-400">Precio Ajustado</p>
                                            <p class={`text-lg font-bold ${simResult().adjustedPrice > simResult().basePrice
                                                    ? "text-red-600 dark:text-red-400"
                                                    : simResult().adjustedPrice < simResult().basePrice
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-gray-900 dark:text-white"
                                                }`}>
                                                {formatPrice(simResult().adjustedPrice)}
                                            </p>
                                        </div>
                                        <div>
                                            <p class="text-xs text-gray-500 dark:text-gray-400">Temporada Aplicada</p>
                                            <Show
                                                when={simResult().season}
                                                fallback={
                                                    <p class="text-sm text-gray-500 dark:text-gray-400">
                                                        Sin temporada (precio base)
                                                    </p>
                                                }
                                            >
                                                <p class="text-sm font-medium text-gray-900 dark:text-white">
                                                    {simResult().season.name}
                                                </p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatModifier(simResult().season.modifierType, simResult().season.modifierValue)}
                                                </p>
                                            </Show>
                                        </div>
                                    </div>
                                </div>
                            </Show>
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
                                <option value="true">Activas</option>
                                <option value="false">Inactivas</option>
                            </select>
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

                    {/* Tabla */}
                    <div class="card overflow-hidden p-0">
                        <Show when={seasons.loading}>
                            <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                                Cargando temporadas...
                            </div>
                        </Show>

                        <Show when={seasons.error}>
                            <div class="p-8 text-center text-red-500">Error al cargar temporadas</div>
                        </Show>

                        <Show when={seasons()}>
                            <Show
                                when={seasons()?.data?.length > 0}
                                fallback={
                                    <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                                        No se encontraron temporadas
                                    </div>
                                }
                            >
                                <div class="overflow-x-auto">
                                    <table class="w-full">
                                        <thead>
                                            <tr class="border-b border-gray-200 dark:border-gray-800">
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha Inicio</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha Fin</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Modificador</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valor</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aplica a</th>
                                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                                <Show when={auth.hasPermission("rooms.update") || auth.hasPermission("rooms.delete")}>
                                                    <th class="px-6 py-3"></th>
                                                </Show>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <For each={seasons()?.data}>
                                                {(season) => (
                                                    <tr class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                                        <td class="px-6 py-4">
                                                            <p class="text-sm font-medium text-gray-900 dark:text-white">{season.seasonName}</p>
                                                        </td>
                                                        <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                                            {formatDate(season.startDate)}
                                                        </td>
                                                        <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                                            {formatDate(season.endDate)}
                                                        </td>
                                                        <td class="px-6 py-4">
                                                            <span class={`px-2 py-1 rounded-full text-xs font-medium ${season.modifierType === "porcentaje"
                                                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                                                                    : "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
                                                                }`}>
                                                                {modifierLabel(season.modifierType)}
                                                            </span>
                                                        </td>
                                                        <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                            {formatModifier(season.modifierType, season.modifierValue)}
                                                        </td>
                                                        <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                                            {roomTypeLabel(season.roomType)}
                                                        </td>
                                                        <td class="px-6 py-4">
                                                            <span class={`px-2 py-1 rounded-full text-xs font-medium ${season.isActive
                                                                    ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                                                                    : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                                                }`}>
                                                                {season.isActive ? "Activa" : "Inactiva"}
                                                            </span>
                                                        </td>
                                                        <Show when={auth.hasPermission("rooms.update") || auth.hasPermission("rooms.delete")}>
                                                            <td class="px-6 py-4">
                                                                <div class="flex items-center gap-2 justify-end">
                                                                    <Show when={auth.hasPermission("rooms.update")}>
                                                                        <button
                                                                            onClick={() => openEdit(season)}
                                                                            class="text-xs px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                                                                        >
                                                                            Editar
                                                                        </button>
                                                                    </Show>
                                                                    <Show when={auth.hasPermission("rooms.delete")}>
                                                                        <button
                                                                            onClick={() => handleToggleStatus(season)}
                                                                            class={`text-xs px-3 py-1.5 rounded-md border transition-colors ${season.isActive
                                                                                    ? "border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                                                    : "border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10"
                                                                                }`}
                                                                        >
                                                                            {season.isActive ? "Desactivar" : "Reactivar"}
                                                                        </button>
                                                                    </Show>
                                                                </div>
                                                            </td>
                                                        </Show>
                                                    </tr>
                                                )}
                                            </For>
                                        </tbody>
                                    </table>
                                </div>

                                <Show when={seasons()?.pagination}>
                                    <Pagination
                                        currentPage={currentPage()}
                                        totalPages={seasons().pagination.totalPages}
                                        onPageChange={(p) => setCurrentPage(p)}
                                    />
                                </Show>
                            </Show>
                        </Show>
                    </div>
                </div>

                {/* ============================================ */}
                {/* MODAL CREAR / EDITAR */}
                {/* ============================================ */}
                <Show when={showModal()}>
                    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-lg shadow-xl">
                            <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                                    {editingSeason() ? `Editar: ${editingSeason().seasonName}` : "Nueva Temporada"}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} class="p-6 space-y-4">
                                {/* Nombre */}
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Nombre de temporada
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        class="input-field w-full"
                                        placeholder="Ej: Temporada Alta, Semana Santa"
                                        value={formName()}
                                        onInput={(e) => setFormName(e.target.value)}
                                    />
                                </div>

                                {/* Fechas */}
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Fecha inicio
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            class="input-field w-full"
                                            value={formStartDate()}
                                            onInput={(e) => setFormStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Fecha fin
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            class="input-field w-full"
                                            min={formStartDate()}
                                            value={formEndDate()}
                                            onInput={(e) => setFormEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Tipo y valor del modificador */}
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Tipo de modificador
                                        </label>
                                        <select
                                            class="input-field w-full"
                                            value={formModifierType()}
                                            onChange={(e) => setFormModifierType(e.target.value)}
                                            required
                                        >
                                            <For each={MODIFIER_TYPES}>
                                                {(m) => <option value={m.value}>{m.label}</option>}
                                            </For>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Valor ({formModifierType() === "porcentaje" ? "%" : "$"})
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step={formModifierType() === "fijo" ? "0.01" : "1"}
                                            class="input-field w-full"
                                            placeholder={formModifierType() === "porcentaje" ? "Ej: 30" : "Ej: 25.00"}
                                            value={formModifierValue()}
                                            onInput={(e) => setFormModifierValue(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Preview del modificador */}
                                <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                                    <p class="text-xs text-gray-500 dark:text-gray-400">
                                        Vista previa: Una habitación de $100.00 quedaría en{" "}
                                        <span class="font-medium text-gray-900 dark:text-white">
                                            {formModifierType() === "porcentaje"
                                                ? formatPrice(100 + (100 * Number(formModifierValue()) / 100))
                                                : formatPrice(100 + Number(formModifierValue()))
                                            }
                                        </span>
                                        {" "}({formatModifier(formModifierType(), Number(formModifierValue()))})
                                    </p>
                                </div>

                                {/* Aplica a */}
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Aplica a tipo de habitación
                                    </label>
                                    <select
                                        class="input-field w-full"
                                        value={formRoomType()}
                                        onChange={(e) => setFormRoomType(e.target.value)}
                                        required
                                    >
                                        <For each={ROOM_TYPES}>
                                            {(type) => (
                                                <option value={type}>{type === "todas" ? "Todas las habitaciones" : type}</option>
                                            )}
                                        </For>
                                    </select>
                                </div>

                                {/* Error */}
                                <Show when={modalError()}>
                                    <div class="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                                        {modalError()}
                                    </div>
                                </Show>

                                {/* Botones */}
                                <div class="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowModal(false)} class="btn-secondary flex-1">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={modalLoading()} class="btn-primary flex-1 disabled:opacity-50">
                                        {modalLoading() ? "Guardando..." : editingSeason() ? "Actualizar" : "Crear Temporada"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </Show>
            </Layout>
        </ProtectedRoute>
    );
}

export default SeasonalPrices;