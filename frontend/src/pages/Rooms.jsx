import { createSignal, createResource, Show, For, onCleanup } from "solid-js";
import { api } from "../services/api";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "@solidjs/router";
import { showToast } from "../utils/toast";
import Pagination from "../components/Pagination";

// URL base del backend para las imágenes
const BACKEND_URL = "http://localhost:4000";

// Tipos de habitación (match con el enum del modelo)
const ROOM_TYPES = ["Simple", "Doble", "Suite", "Deluxe", "Presidencial", "Single", "Triple", "Twin"];

// Estados de habitación
const ROOM_STATUSES = ["disponible", "ocupada", "mantenimiento", "limpieza"];

// Amenidades sugeridas
const SUGGESTED_AMENITIES = [
  "WiFi",
  "AC",
  "TV",
  "Minibar",
  "Caja Fuerte",
  "Balcón",
  "Vista al Mar",
  "Jacuzzi",
  "Cocina",
  "Sala de Estar",
];

function Rooms() {
  const auth = useAuth();
  const navigate = useNavigate();

  // Verificar permiso
  if (!auth.hasPermission("rooms.read")) {
    navigate("/dashboard");
    return null;
  }

  // Paginación
  const [currentPage, setCurrentPage] = createSignal(1);
  const [limit] = createSignal(10);

  // Vista activas / desactivadas
  const [viewingInactive, setViewingInactive] = createSignal(false);

  // Filtros (inputs)
  const [typeInput, setTypeInput] = createSignal("");
  const [statusInput, setStatusInput] = createSignal("");
  const [minPriceInput, setMinPriceInput] = createSignal("");
  const [maxPriceInput, setMaxPriceInput] = createSignal("");

  // Filtros aplicados
  const [appliedFilters, setAppliedFilters] = createSignal({
    type: "",
    status: "",
    minPrice: "",
    maxPrice: "",
  });

  // Resource de habitaciones
  const [rooms, { refetch }] = createResource(
    () => ({
      ...appliedFilters(),
      page: currentPage(),
      limit: limit(),
      viewingInactive: viewingInactive(),
    }),
    async (params) => {
      const filters = {};
      if (params.type) filters.type = params.type;
      if (params.status) filters.status = params.status;
      if (params.minPrice) filters.minPrice = params.minPrice;
      if (params.maxPrice) filters.maxPrice = params.maxPrice;
      filters.page = params.page;
      filters.limit = params.limit;

      if (params.viewingInactive) {
        // Pedimos todas (incluye inactivas) y filtramos solo las desactivadas
        filters.includeInactive = "true";
      }

      const result = await api.getRooms(filters);

      // Si estamos viendo inactivas, filtrar solo las que tienen isActive = false
      if (params.viewingInactive && result.data) {
        const inactiveRooms = result.data.filter((room) => !room.isActive);
        return {
          ...result,
          data: inactiveRooms,
          total: inactiveRooms.length,
        };
      }

      return result;
    },
  );

  // Modal CRUD
  const [showModal, setShowModal] = createSignal(false);
  const [editingRoom, setEditingRoom] = createSignal(null);
  const [modalLoading, setModalLoading] = createSignal(false);
  const [modalError, setModalError] = createSignal("");

  // Modal de galería
  const [showGallery, setShowGallery] = createSignal(false);
  const [galleryRoom, setGalleryRoom] = createSignal(null);
  const [galleryIndex, setGalleryIndex] = createSignal(0);

  // Form state
  const [formRoomNumber, setFormRoomNumber] = createSignal("");
  const [formType, setFormType] = createSignal("Simple");
  const [formCapacity, setFormCapacity] = createSignal(1);
  const [formBasePrice, setFormBasePrice] = createSignal(0);
  const [formFloor, setFormFloor] = createSignal(1);
  const [formDescription, setFormDescription] = createSignal("");
  const [formAmenities, setFormAmenities] = createSignal([]);
  const [formStatus, setFormStatus] = createSignal("disponible");
  const [formImages, setFormImages] = createSignal([]); // Files nuevos a subir
  const [formImagePreviews, setFormImagePreviews] = createSignal([]); // Preview URLs

  // Aplicar filtros
  const applyFilters = () => {
    setAppliedFilters({
      type: typeInput(),
      status: statusInput(),
      minPrice: minPriceInput(),
      maxPrice: maxPriceInput(),
    });
    setCurrentPage(1);
  };

  // Limpiar filtros
  const clearFilters = () => {
    setTypeInput("");
    setStatusInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setAppliedFilters({
      type: "",
      status: "",
      minPrice: "",
      maxPrice: "",
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Limpiar previews al desmontar
  onCleanup(() => {
    formImagePreviews().forEach((url) => URL.revokeObjectURL(url));
  });

  // Abrir modal crear
  const openCreate = () => {
    setEditingRoom(null);
    setFormRoomNumber("");
    setFormType("Simple");
    setFormCapacity(1);
    setFormBasePrice(0);
    setFormFloor(1);
    setFormDescription("");
    setFormAmenities([]);
    setFormStatus("disponible");
    setFormImages([]);
    setFormImagePreviews([]);
    setModalError("");
    setShowModal(true);
  };

  // Abrir modal editar
  const openEdit = (room) => {
    setEditingRoom(room);
    setFormRoomNumber(room.roomNumber);
    setFormType(room.type);
    setFormCapacity(room.capacity);
    setFormBasePrice(room.basePrice);
    setFormFloor(room.floor || 1);
    setFormDescription(room.description || "");
    setFormAmenities(room.amenities || []);
    setFormStatus(room.status);
    setFormImages([]);
    setFormImagePreviews([]);
    setModalError("");
    setShowModal(true);
  };

  // Manejar selección de imágenes
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Agregar a los archivos existentes
    setFormImages((prev) => [...prev, ...files]);

    // Crear previews
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setFormImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  // Remover imagen nueva (preview) antes de enviar
  const removeNewImage = (index) => {
    URL.revokeObjectURL(formImagePreviews()[index]);
    setFormImages((prev) => prev.filter((_, i) => i !== index));
    setFormImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Eliminar imagen existente del servidor
  const handleDeleteExistingImage = async (roomId, imageIndex) => {
    showToast.confirm(
      "¿Eliminar esta imagen de la habitación?",
      async () => {
        try {
          const result = await api.deleteRoomImage(roomId, imageIndex);
          // Actualizar la habitación en edición
          setEditingRoom(result.data);
          refetch();
          showToast.success("Imagen eliminada correctamente");
        } catch (error) {
          showToast.error(error.message);
        }
      },
    );
  };

  // Toggle amenidad
  const toggleAmenity = (amenity) => {
    setFormAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity],
    );
  };

  // Submit crear/editar
  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");

    try {
      const formData = new FormData();
      formData.append("roomNumber", formRoomNumber());
      formData.append("type", formType());
      formData.append("capacity", formCapacity());
      formData.append("basePrice", formBasePrice());
      formData.append("floor", formFloor());
      formData.append("description", formDescription());
      formData.append("status", formStatus());

      // Amenities como JSON string (el backend debe parsear)
      formAmenities().forEach((amenity) => {
        formData.append("amenities[]", amenity);
      });

      // Imágenes nuevas
      formImages().forEach((file) => {
        formData.append("images", file);
      });

      if (editingRoom()) {
        await api.updateRoom(editingRoom()._id, formData);
        showToast.success("Habitación actualizada correctamente");
      } else {
        await api.createRoom(formData);
        showToast.success("Habitación creada exitosamente");
      }

      setShowModal(false);
      refetch();
    } catch (error) {
      setModalError(error.message);
      showToast.error(error.message);
    }

    setModalLoading(false);
  };

  // Soft delete
  const handleDelete = (room) => {
    showToast.confirm(
      `¿Desactivar la habitación ${room.roomNumber}?`,
      async () => {
        try {
          await api.deleteRoom(room._id);
          refetch();
          showToast.success("Habitación desactivada correctamente");
        } catch (error) {
          showToast.error(error.message);
        }
      },
    );
  };

  // Reactivar habitación
  const handleReactivate = (room) => {
    showToast.confirm(
      `¿Reactivar la habitación ${room.roomNumber}?`,
      async () => {
        try {
          await api.reactivateRoom(room._id);
          refetch();
          showToast.success("Habitación reactivada correctamente");
        } catch (error) {
          showToast.error(error.message);
        }
      },
    );
  };

  const handleQuickStatus = (room) => {
    showToast.confirm(
      `¿Marcar la habitación #${room.roomNumber} como disponible?`,
      async () => {
        try {
          const formData = new FormData();
          formData.append("status", "disponible");
          await api.requestFormData(`/rooms/${room._id}`, formData, "PUT");
          showToast.success(`Habitación #${room.roomNumber} marcada como disponible`);
          refetch();
        } catch (error) {
          showToast.error(error.message);
        }
      },
    );
  };

  // Cambiar entre vista activas/inactivas
  const toggleView = (inactive) => {
    setViewingInactive(inactive);
    setCurrentPage(1);
    clearFilters();
  };

  // Abrir galería
  const openGallery = (room, index = 0) => {
    setGalleryRoom(room);
    setGalleryIndex(index);
    setShowGallery(true);
  };

  // Helpers de UI
  const statusColor = (status) => {
    const colors = {
      disponible:
        "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
      ocupada:
        "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
      mantenimiento:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
      limpieza:
        "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    };
    return colors[status] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  };

  const statusLabel = (status) => {
    const labels = {
      disponible: "Disponible",
      ocupada: "Ocupada",
      mantenimiento: "Mantenimiento",
      limpieza: "Limpieza",
    };
    return labels[status] || status;
  };

  const typeColor = (type) => {
    const colors = {
      Simple: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      Doble: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
      Suite: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
      Deluxe: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
      Presidencial: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    };
    return colors[type] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-SV", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div class="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div class="flex justify-between items-center mb-8">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                Habitaciones
              </h1>
              <p class="text-gray-500 dark:text-gray-400 mt-1">
                Gestiona las habitaciones del hotel
              </p>
            </div>
            <Show when={auth.hasPermission("rooms.create") && !viewingInactive()}>
              <button onClick={openCreate} class="btn-primary">
                + Nueva habitación
              </button>
            </Show>
          </div>

          {/* Tabs: Activas / Desactivadas */}
          <Show when={auth.hasPermission("rooms.delete")}>
            <div class="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-1 w-fit">
              <button
                onClick={() => toggleView(false)}
                class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!viewingInactive()
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                Activas
              </button>
              <button
                onClick={() => toggleView(true)}
                class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewingInactive()
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                Desactivadas
              </button>
            </div>
          </Show>

          {/* Filtros */}
          <div class="card mb-6">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Filtros
            </p>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Tipo */}
              <select
                class="input-field"
                value={typeInput()}
                onChange={(e) => setTypeInput(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                <For each={ROOM_TYPES}>
                  {(type) => <option value={type}>{type}</option>}
                </For>
              </select>

              {/* Estado */}
              <select
                class="input-field"
                value={statusInput()}
                onChange={(e) => setStatusInput(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <For each={ROOM_STATUSES}>
                  {(status) => (
                    <option value={status}>{statusLabel(status)}</option>
                  )}
                </For>
              </select>

              {/* Precio mínimo */}
              <input
                type="number"
                class="input-field"
                placeholder="Precio mínimo"
                value={minPriceInput()}
                onInput={(e) => setMinPriceInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && applyFilters()}
              />

              {/* Precio máximo */}
              <input
                type="number"
                class="input-field"
                placeholder="Precio máximo"
                value={maxPriceInput()}
                onInput={(e) => setMaxPriceInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && applyFilters()}
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
            <Show when={rooms.loading}>
              <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                Cargando habitaciones...
              </div>
            </Show>

            <Show when={rooms.error}>
              <div class="p-8 text-center text-red-500">
                Error al cargar habitaciones
              </div>
            </Show>

            <Show when={rooms()}>
              <Show
                when={rooms()?.data?.length > 0}
                fallback={
                  <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                    {viewingInactive()
                      ? "No hay habitaciones desactivadas"
                      : "No se encontraron habitaciones"}
                  </div>
                }
              >
                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead>
                      <tr class="border-b border-gray-200 dark:border-gray-800">
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Habitación
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Capacidad
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Precio
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Estado
                        </th>
                        <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Piso
                        </th>
                        <Show
                          when={
                            auth.hasPermission("rooms.update") ||
                            auth.hasPermission("rooms.delete")
                          }
                        >
                          <th class="px-6 py-3"></th>
                        </Show>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={rooms()?.data}>
                        {(room) => (
                          <tr
                            class="border-b border-gray-100 dark:border-gray-800/50 
                                     hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                          >
                            {/* Habitación: número + miniatura */}
                            <td class="px-6 py-4">
                              <div class="flex items-center gap-3">
                                {/* Miniatura de imagen */}
                                <div
                                  class="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 
                                            flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer"
                                  onClick={() =>
                                    room.images?.length > 0 && openGallery(room, 0)
                                  }
                                >
                                  <Show
                                    when={room.images && room.images.length > 0}
                                    fallback={
                                      <svg
                                        class="w-5 h-5 text-gray-400"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                          stroke-width="2"
                                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                      </svg>
                                    }
                                  >
                                    <img
                                      src={`${BACKEND_URL}${room.images[0]}`}
                                      alt={`Habitación ${room.roomNumber}`}
                                      class="w-full h-full object-cover"
                                    />
                                  </Show>
                                </div>
                                <div>
                                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                                    #{room.roomNumber}
                                  </p>
                                  <Show when={room.images?.length > 0}>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">
                                      {room.images.length} foto
                                      {room.images.length > 1 ? "s" : ""}
                                    </p>
                                  </Show>
                                </div>
                              </div>
                            </td>

                            {/* Tipo */}
                            <td class="px-6 py-4">
                              <span
                                class={`px-2 py-1 rounded-full text-xs font-medium ${typeColor(room.type)}`}
                              >
                                {room.type}
                              </span>
                            </td>

                            {/* Capacidad */}
                            <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                              {room.capacity} persona{room.capacity > 1 ? "s" : ""}
                            </td>

                            {/* Precio */}
                            <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                              {formatPrice(room.basePrice)}
                            </td>

                            {/* Estado */}
                            <td class="px-6 py-4">
                              <span
                                class={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(room.status)}`}
                              >
                                {statusLabel(room.status)}
                              </span>
                            </td>

                            {/* Piso */}
                            <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                              {room.floor || "—"}
                            </td>

                            {/* Acciones */}
                            <Show
                              when={
                                auth.hasPermission("rooms.update") ||
                                auth.hasPermission("rooms.delete")
                              }
                            >
                              <td class="px-6 py-4">
                                <div class="flex items-center gap-2 justify-end">
                                  {/* Ver galería */}
                                  <Show when={room.images?.length > 0}>
                                    <button
                                      onClick={() => openGallery(room)}
                                      class="text-xs px-3 py-1.5 rounded-md border border-blue-200 
                                               dark:border-blue-500/30 text-blue-600 dark:text-blue-400
                                               hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                    >
                                      Fotos
                                    </button>
                                  </Show>

                                  {/* Cambio rápido de estado */}
                                  <Show when={auth.hasPermission("rooms.update") && ["limpieza", "ocupada"].includes(room.status)}>
                                    <button
                                      onClick={() => handleQuickStatus(room)}
                                      class="text-xs px-3 py-1.5 rounded-md border border-green-200 
                                            dark:border-green-500/30 text-green-600 dark:text-green-400
                                            hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                                    >
                                      ✓ Disponible
                                    </button>
                                  </Show>

                                  {/* Editar */}
                                  <Show when={auth.hasPermission("rooms.update")}>
                                    <button
                                      onClick={() => openEdit(room)}
                                      class="text-xs px-3 py-1.5 rounded-md border border-gray-200 
                                               dark:border-gray-700 text-gray-600 dark:text-gray-400
                                               hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                                    >
                                      Editar
                                    </button>
                                  </Show>

                                  {/* Desactivar / Reactivar */}
                                  <Show when={auth.hasPermission("rooms.delete")}>
                                    <Show
                                      when={!viewingInactive()}
                                      fallback={
                                        <button
                                          onClick={() => handleReactivate(room)}
                                          class="text-xs px-3 py-1.5 rounded-md border border-green-200 
                                                   dark:border-green-500/30 text-green-600 dark:text-green-400
                                                   hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                                        >
                                          Reactivar
                                        </button>
                                      }
                                    >
                                      <button
                                        onClick={() => handleDelete(room)}
                                        class="text-xs px-3 py-1.5 rounded-md border border-red-200 
                                                 dark:border-red-500/30 text-red-600 dark:text-red-400
                                                 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                      >
                                        Desactivar
                                      </button>
                                    </Show>
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

                {/* Paginación */}
                <Show when={rooms()?.pagination}>
                  <Pagination
                    currentPage={currentPage()}
                    totalPages={rooms().pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </Show>
              </Show>
            </Show>
          </div>
        </div>

        {/* ============================================ */}
        {/* MODAL CREAR / EDITAR HABITACIÓN */}
        {/* ============================================ */}
        <Show when={showModal()}>
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
              class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 
                        rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div
                class="flex justify-between items-center px-6 py-4 border-b 
                          border-gray-200 dark:border-gray-800 flex-shrink-0"
              >
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingRoom() ? `Editar habitación #${editingRoom().roomNumber}` : "Nueva habitación"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              {/* Body scrollable */}
              <form onSubmit={handleSubmit} class="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Fila 1: Número + Tipo */}
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Número de habitación
                    </label>
                    <input
                      type="text"
                      required
                      class="input-field w-full"
                      placeholder="Ej: 101, 202-A"
                      value={formRoomNumber()}
                      onInput={(e) => setFormRoomNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo
                    </label>
                    <select
                      class="input-field w-full"
                      value={formType()}
                      onChange={(e) => setFormType(e.target.value)}
                      required
                    >
                      <For each={ROOM_TYPES}>
                        {(type) => <option value={type}>{type}</option>}
                      </For>
                    </select>
                  </div>
                </div>

                {/* Fila 2: Capacidad + Precio + Piso */}
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Capacidad (personas)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      class="input-field w-full"
                      value={formCapacity()}
                      onInput={(e) => setFormCapacity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Precio base ($)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      class="input-field w-full"
                      value={formBasePrice()}
                      onInput={(e) => setFormBasePrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Piso
                    </label>
                    <input
                      type="number"
                      class="input-field w-full"
                      value={formFloor()}
                      onInput={(e) => setFormFloor(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                {/* Estado (solo en edición) */}
                <Show when={editingRoom()}>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Estado
                    </label>
                    <select
                      class="input-field w-full"
                      value={formStatus()}
                      onChange={(e) => setFormStatus(e.target.value)}
                    >
                      <For each={ROOM_STATUSES}>
                        {(status) => (
                          <option value={status}>{statusLabel(status)}</option>
                        )}
                      </For>
                    </select>
                  </div>
                </Show>

                {/* Descripción */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    class="input-field w-full"
                    rows="3"
                    placeholder="Describe la habitación..."
                    value={formDescription()}
                    onInput={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                {/* Amenidades */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amenidades
                  </label>
                  <div class="flex flex-wrap gap-2">
                    <For each={SUGGESTED_AMENITIES}>
                      {(amenity) => (
                        <button
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          class={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${formAmenities().includes(amenity)
                            ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40"
                            : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                            }`}
                        >
                          {formAmenities().includes(amenity) ? "✓ " : ""}
                          {amenity}
                        </button>
                      )}
                    </For>
                  </div>
                </div>

                {/* Imágenes existentes (solo en edición) */}
                <Show when={editingRoom()?.images?.length > 0}>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Imágenes actuales
                    </label>
                    <div class="grid grid-cols-4 gap-2">
                      <For each={editingRoom().images}>
                        {(img, index) => (
                          <div class="relative group rounded-lg overflow-hidden aspect-square">
                            <img
                              src={`${BACKEND_URL}${img}`}
                              alt={`Imagen ${index() + 1}`}
                              class="w-full h-full object-cover"
                            />
                            <Show when={auth.hasPermission("rooms.update")}>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteExistingImage(editingRoom()._id, index())
                                }
                                class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full 
                                         text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 
                                         transition-opacity"
                              >
                                ✕
                              </button>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* Subir imágenes nuevas */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {editingRoom() ? "Agregar nuevas imágenes" : "Imágenes"}
                  </label>
                  <div
                    class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 
                              text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={() => document.getElementById("room-images-input").click()}
                  >
                    <svg
                      class="w-8 h-8 mx-auto text-gray-400 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      Haz clic para seleccionar imágenes
                    </p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      JPG, PNG, WEBP
                    </p>
                  </div>
                  <input
                    id="room-images-input"
                    type="file"
                    multiple
                    accept="image/*"
                    class="hidden"
                    onChange={handleImageSelect}
                  />

                  {/* Preview de nuevas imágenes */}
                  <Show when={formImagePreviews().length > 0}>
                    <div class="grid grid-cols-4 gap-2 mt-3">
                      <For each={formImagePreviews()}>
                        {(preview, index) => (
                          <div class="relative group rounded-lg overflow-hidden aspect-square">
                            <img
                              src={preview}
                              alt={`Preview ${index() + 1}`}
                              class="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeNewImage(index())}
                              class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full 
                                       text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 
                                       transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>

                {/* Error */}
                <Show when={modalError()}>
                  <div
                    class="bg-red-500/10 border border-red-500/30 text-red-600 
                              dark:text-red-400 px-4 py-3 rounded-md text-sm"
                  >
                    {modalError()}
                  </div>
                </Show>

                {/* Botones */}
                <div class="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    class="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading()}
                    class="btn-primary flex-1 disabled:opacity-50"
                  >
                    {modalLoading()
                      ? "Guardando..."
                      : editingRoom()
                        ? "Actualizar"
                        : "Crear habitación"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        {/* ============================================ */}
        {/* MODAL GALERÍA DE IMÁGENES */}
        {/* ============================================ */}
        <Show when={showGallery() && galleryRoom()}>
          <div
            class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowGallery(false);
            }}
          >
            <div class="relative max-w-4xl w-full">
              {/* Cerrar */}
              <button
                onClick={() => setShowGallery(false)}
                class="absolute -top-10 right-0 text-white/70 hover:text-white text-sm"
              >
                ✕ Cerrar
              </button>

              {/* Título */}
              <p class="absolute -top-10 left-0 text-white/70 text-sm">
                Habitación #{galleryRoom().roomNumber} — Foto{" "}
                {galleryIndex() + 1} de {galleryRoom().images.length}
              </p>

              {/* Imagen principal */}
              <div class="bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center min-h-[400px]">
                <img
                  src={`${BACKEND_URL}${galleryRoom().images[galleryIndex()]}`}
                  alt={`Habitación ${galleryRoom().roomNumber}`}
                  class="max-w-full max-h-[70vh] object-contain"
                />
              </div>

              {/* Navegación */}
              <Show when={galleryRoom().images.length > 1}>
                {/* Anterior */}
                <button
                  onClick={() =>
                    setGalleryIndex((prev) =>
                      prev > 0 ? prev - 1 : galleryRoom().images.length - 1,
                    )
                  }
                  class="absolute top-1/2 -translate-y-1/2 left-2 w-10 h-10 bg-black/50 
                           hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  ‹
                </button>

                {/* Siguiente */}
                <button
                  onClick={() =>
                    setGalleryIndex((prev) =>
                      prev < galleryRoom().images.length - 1 ? prev + 1 : 0,
                    )
                  }
                  class="absolute top-1/2 -translate-y-1/2 right-2 w-10 h-10 bg-black/50 
                           hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  ›
                </button>

                {/* Miniaturas */}
                <div class="flex gap-2 mt-3 justify-center">
                  <For each={galleryRoom().images}>
                    {(img, index) => (
                      <button
                        onClick={() => setGalleryIndex(index())}
                        class={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${galleryIndex() === index()
                          ? "border-white scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                      >
                        <img
                          src={`${BACKEND_URL}${img}`}
                          alt={`Miniatura ${index() + 1}`}
                          class="w-full h-full object-cover"
                        />
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </Layout>
    </ProtectedRoute>
  );
}

export default Rooms;