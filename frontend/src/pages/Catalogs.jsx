import { createSignal, createResource, Show, For } from "solid-js";
import { api } from "../services/api";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "@solidjs/router";
import { showToast } from "../utils/toast";

function Catalogs() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (!auth.hasPermission("catalogs.read")) {
    navigate("/dashboard");
    return null;
  }

  const canCreate = () => auth.hasPermission("catalogs.create");
  const canUpdate = () => auth.hasPermission("catalogs.update");
  const canDelete = () => auth.hasPermission("catalogs.delete");

  // ============================================
  // AMENIDADES
  // ============================================
  const [amenities, { refetch: refetchAmenities }] = createResource(() => api.getAmenities());
  const [amenityModal, setAmenityModal] = createSignal(false);
  const [editingAmenity, setEditingAmenity] = createSignal(null);
  const [amenityName, setAmenityName] = createSignal("");
  const [amenityLoading, setAmenityLoading] = createSignal(false);

  const openAmenityCreate = () => {
    setEditingAmenity(null);
    setAmenityName("");
    setAmenityModal(true);
  };

  const openAmenityEdit = (amenity) => {
    setEditingAmenity(amenity);
    setAmenityName(amenity.name);
    setAmenityModal(true);
  };

  const submitAmenity = async (e) => {
    e.preventDefault();
    if (!amenityName().trim()) return;
    setAmenityLoading(true);
    try {
      if (editingAmenity()) {
        await api.updateAmenity(editingAmenity()._id, { name: amenityName() });
        showToast.success("Amenidad actualizada");
      } else {
        await api.createAmenity(amenityName());
        showToast.success("Amenidad creada");
      }
      setAmenityModal(false);
      refetchAmenities();
    } catch (error) {
      showToast.error(error.message);
    }
    setAmenityLoading(false);
  };

  const deleteAmenity = (amenity) => {
    showToast.confirm(`¿Eliminar la amenidad "${amenity.name}"?`, async () => {
      try {
        await api.deleteAmenity(amenity._id);
        showToast.success("Amenidad eliminada");
        refetchAmenities();
      } catch (error) {
        showToast.error(error.message);
      }
    });
  };

  // ============================================
  // TIPOS DE HABITACIÓN
  // ============================================
  const [roomTypes, { refetch: refetchRoomTypes }] = createResource(() => api.getRoomTypes());
  const [roomTypeModal, setRoomTypeModal] = createSignal(false);
  const [editingRoomType, setEditingRoomType] = createSignal(null);
  const [roomTypeName, setRoomTypeName] = createSignal("");
  const [roomTypeLoading, setRoomTypeLoading] = createSignal(false);

  const openRoomTypeCreate = () => {
    setEditingRoomType(null);
    setRoomTypeName("");
    setRoomTypeModal(true);
  };

  const openRoomTypeEdit = (roomType) => {
    setEditingRoomType(roomType);
    setRoomTypeName(roomType.name);
    setRoomTypeModal(true);
  };

  const submitRoomType = async (e) => {
    e.preventDefault();
    if (!roomTypeName().trim()) return;
    setRoomTypeLoading(true);
    try {
      if (editingRoomType()) {
        await api.updateRoomType(editingRoomType()._id, { name: roomTypeName() });
        showToast.success("Tipo actualizado");
      } else {
        await api.createRoomType(roomTypeName());
        showToast.success("Tipo creado");
      }
      setRoomTypeModal(false);
      refetchRoomTypes();
    } catch (error) {
      showToast.error(error.message);
    }
    setRoomTypeLoading(false);
  };

  const deleteRoomType = (roomType) => {
    showToast.confirm(`¿Eliminar el tipo "${roomType.name}"?`, async () => {
      try {
        await api.deleteRoomType(roomType._id);
        showToast.success("Tipo eliminado");
        refetchRoomTypes();
      } catch (error) {
        showToast.error(error.message);
      }
    });
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div class="p-8 max-w-5xl mx-auto">
          {/* Header */}
          <div class="mb-8">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Catálogos</h1>
            <p class="text-gray-500 dark:text-gray-400 mt-1">
              Gestiona los tipos de habitación y amenidades disponibles
            </p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* ============================================ */}
            {/* TIPOS DE HABITACIÓN */}
            {/* ============================================ */}
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Tipos de Habitación</h2>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {roomTypes()?.data?.length || 0} tipos registrados
                  </p>
                </div>
                <Show when={canCreate()}>
                  <button onClick={openRoomTypeCreate} class="btn-primary text-sm">
                    + Nuevo tipo
                  </button>
                </Show>
              </div>

              <Show when={roomTypes.loading}>
                <p class="text-sm text-gray-400 py-4 text-center">Cargando...</p>
              </Show>

              <Show when={roomTypes()}>
                <div class="space-y-2">
                  <For each={roomTypes()?.data} fallback={
                    <p class="text-sm text-gray-400 py-4 text-center">No hay tipos registrados</p>
                  }>
                    {(rt) => (
                      <div class="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <span class="text-sm font-medium text-gray-900 dark:text-white">{rt.name}</span>
                        <div class="flex gap-2">
                          <Show when={canUpdate()}>
                            <button
                              onClick={() => openRoomTypeEdit(rt)}
                              class="text-xs px-2.5 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 transition-colors"
                            >
                              Editar
                            </button>
                          </Show>
                          <Show when={canDelete()}>
                            <button
                              onClick={() => deleteRoomType(rt)}
                              class="text-xs px-2.5 py-1 rounded border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              Eliminar
                            </button>
                          </Show>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            {/* ============================================ */}
            {/* AMENIDADES */}
            {/* ============================================ */}
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Amenidades</h2>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {amenities()?.data?.length || 0} amenidades registradas
                  </p>
                </div>
                <Show when={canCreate()}>
                  <button onClick={openAmenityCreate} class="btn-primary text-sm">
                    + Nueva amenidad
                  </button>
                </Show>
              </div>

              <Show when={amenities.loading}>
                <p class="text-sm text-gray-400 py-4 text-center">Cargando...</p>
              </Show>

              <Show when={amenities()}>
                <div class="flex flex-wrap gap-2">
                  <For each={amenities()?.data} fallback={
                    <p class="text-sm text-gray-400 py-4 text-center w-full">No hay amenidades registradas</p>
                  }>
                    {(amenity) => (
                      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                        <span class="text-xs font-medium text-blue-700 dark:text-blue-400">{amenity.name}</span>
                        <Show when={canUpdate()}>
                          <button
                            onClick={() => openAmenityEdit(amenity)}
                            class="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors ml-1"
                            title="Editar"
                          >
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </Show>
                        <Show when={canDelete()}>
                          <button
                            onClick={() => deleteAmenity(amenity)}
                            class="text-blue-300 hover:text-red-500 transition-colors"
                            title="Eliminar"
                          >
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </div>

        {/* MODAL Tipo de Habitación */}
        <Show when={roomTypeModal()}>
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-sm shadow-xl">
              <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingRoomType() ? "Editar tipo" : "Nuevo tipo"}
                </h2>
                <button onClick={() => setRoomTypeModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
              </div>
              <form onSubmit={submitRoomType} class="p-6 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    class="input-field w-full"
                    placeholder="Ej: Junior Suite"
                    value={roomTypeName()}
                    onInput={(e) => setRoomTypeName(e.target.value)}
                  />
                </div>
                <div class="flex gap-3 pt-2">
                  <button type="button" onClick={() => setRoomTypeModal(false)} class="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={roomTypeLoading()} class="btn-primary flex-1 disabled:opacity-50">
                    {roomTypeLoading() ? "Guardando..." : editingRoomType() ? "Actualizar" : "Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        {/* MODAL Amenidad */}
        <Show when={amenityModal()}>
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-sm shadow-xl">
              <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingAmenity() ? "Editar amenidad" : "Nueva amenidad"}
                </h2>
                <button onClick={() => setAmenityModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
              </div>
              <form onSubmit={submitAmenity} class="p-6 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    class="input-field w-full"
                    placeholder="Ej: Vista a la piscina"
                    value={amenityName()}
                    onInput={(e) => setAmenityName(e.target.value)}
                  />
                </div>
                <div class="flex gap-3 pt-2">
                  <button type="button" onClick={() => setAmenityModal(false)} class="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={amenityLoading()} class="btn-primary flex-1 disabled:opacity-50">
                    {amenityLoading() ? "Guardando..." : editingAmenity() ? "Actualizar" : "Crear"}
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

export default Catalogs;
