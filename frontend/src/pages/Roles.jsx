import { createSignal, createResource, Show, For } from "solid-js";
import { api } from "../services/api";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import PermissionSelector from "../components/PermissionSelector";
import PermissionBadges from "../components/PermissionBadges";
import Pagination from "../components/Pagination";

function Roles() {
  const auth = useAuth();

  // Paginación
  const [currentPage, setCurrentPage] = createSignal(1);
  const [limit] = createSignal(10);

  const [roles, { refetch: refetchRoles }] = createResource(
    () => ({ page: currentPage(), limit: limit() }),
    (params) => api.getRoles(params),
  );

  const [availablePermissions] = createResource(() => api.getPermissions());

  // Modal state
  const [showModal, setShowModal] = createSignal(false);
  const [showPermissionsModal, setShowPermissionsModal] = createSignal(false);
  const [editingRole, setEditingRole] = createSignal(null);
  const [modalLoading, setModalLoading] = createSignal(false);
  const [modalError, setModalError] = createSignal("");

  // Form state
  const [formName, setFormName] = createSignal("");
  const [formDisplayName, setFormDisplayName] = createSignal("");
  const [formDescription, setFormDescription] = createSignal("");
  const [formPermissions, setFormPermissions] = createSignal([]);

  const openCreate = () => {
    setEditingRole(null);
    setFormName("");
    setFormDisplayName("");
    setFormDescription("");
    setFormPermissions([]);
    setModalError("");
    setShowModal(true);
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDisplayName(role.displayName);
    setFormDescription(role.description || "");
    setFormPermissions(role.permissions || []);
    setModalError("");
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    showToast.confirm(
      `¿Eliminar el rol "${name}"? Esta acción no se puede deshacer.`,
      async () => {
        try {
          await api.deleteRole(id);
          refetchRoles();
          showToast.success("Rol eliminado correctamente");
        } catch (error) {
          showToast.error(error.message);
        }
      },
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");

    try {
      if (editingRole()) {
        await api.updateRole(editingRole()._id, {
          displayName: formDisplayName(),
          description: formDescription(),
          permissions: formPermissions(),
        });
        showToast.success("Rol actualizado correctamente");
      } else {
        await api.createRole({
          name: formName(),
          displayName: formDisplayName(),
          description: formDescription(),
          permissions: formPermissions(),
        });
        showToast.success("Rol creado correctamente");
      }
      setShowModal(false);
      refetchRoles();
    } catch (error) {
      setModalError(error.message);
    }

    setModalLoading(false);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div class="p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div class="flex justify-between items-center mb-8">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                Roles y Permisos
              </h1>
              <p class="text-gray-500 dark:text-gray-400 mt-1">
                Gestiona los roles del sistema y sus permisos
              </p>
            </div>
            <Show when={auth.hasPermission("roles.create")}>
              <button onClick={openCreate} class="btn-primary">
                + Nuevo rol
              </button>
            </Show>
          </div>

          {/* Tabla */}
          <div class="card overflow-hidden p-0">
            <Show when={roles.loading}>
              <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                Cargando roles...
              </div>
            </Show>

            <Show when={roles()}>
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-800">
                    <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Rol
                    </th>
                    <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Permisos
                    </th>
                    <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th class="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  <For each={roles()?.data}>
                    {(role) => (
                      <tr class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                        <td class="px-6 py-4">
                          <div>
                            <p class="text-sm font-medium text-gray-900 dark:text-white">
                              {role.displayName}
                            </p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                              {role.description || "Sin descripción"}
                            </p>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <span class="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                            {role.permissions?.length || 0} permisos
                          </span>
                        </td>
                        <td class="px-6 py-4">
                          <span
                            class={`text-xs px-2 py-1 rounded-full ${
                              role.isSystem
                                ? "bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {role.isSystem ? "Sistema" : "Personalizado"}
                          </span>
                        </td>
                        <Show
                          when={
                            auth.hasPermission("roles.update") ||
                            auth.hasPermission("roles.delete")
                          }
                        >
                          <td class="px-6 py-4">
                            <div class="flex items-center gap-2 justify-end">
                              <Show when={auth.hasPermission("roles.update")}>
                                <button
                                  onClick={() => openEdit(role)}
                                  class="text-xs px-3 py-1.5 rounded-md border border-gray-200 
                 dark:border-gray-700 text-gray-600 dark:text-gray-400
                 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                                >
                                  Editar
                                </button>
                              </Show>

                              <Show
                                when={
                                  auth.hasPermission("roles.delete") &&
                                  !role.isSystem
                                }
                              >
                                <button
                                  onClick={() =>
                                    handleDelete(role._id, role.displayName)
                                  }
                                  class="text-xs px-3 py-1.5 rounded-md border border-red-200
                 dark:border-red-500/30 text-red-600 dark:text-red-400
                 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                >
                                  Eliminar
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

              <Show when={roles()?.pagination}>
                <Pagination
                  currentPage={currentPage()}
                  totalPages={roles().pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </Show>
            </Show>
          </div>
        </div>

        {/* Modal para Crear/Editar Rol */}
        <Show when={showModal()}>
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div
              class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 
                        rounded-xl w-full max-w-2xl shadow-xl my-8"
            >
              <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingRole() ? "Editar rol" : "Nuevo rol"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} class="p-6 space-y-4">
                <Show when={!editingRole()}>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre técnico (sin espacios, minúsculas)
                    </label>
                    <input
                      type="text"
                      required
                      pattern="[a-z_]+"
                      class="input-field w-full"
                      placeholder="ej: editor, soporte"
                      value={formName()}
                      onInput={(e) => setFormName(e.target.value.toLowerCase())}
                    />
                  </div>
                </Show>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre para mostrar
                  </label>
                  <input
                    type="text"
                    required
                    class="input-field w-full"
                    placeholder="ej: Editor de Contenido"
                    value={formDisplayName()}
                    onInput={(e) => setFormDisplayName(e.target.value)}
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    class="input-field w-full"
                    rows="2"
                    placeholder="Describe las responsabilidades de este rol"
                    value={formDescription()}
                    onInput={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                {/* Vista previa de permisos */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Permisos ({formPermissions().length} seleccionados)
                  </label>

                  {/* Vista previa compacta con badges */}
                  <Show when={availablePermissions()}>
                    <div
                      class="mb-3 p-3 border border-gray-200 dark:border-gray-800 rounded-lg 
                                bg-gray-50 dark:bg-gray-900/50 min-h-[60px]"
                    >
                      <PermissionBadges
                        permissions={formPermissions()}
                        availablePermissions={
                          availablePermissions()?.permissions || {}
                        }
                      />
                    </div>
                  </Show>

                  {/* Botón para abrir modal grande */}
                  <button
                    type="button"
                    onClick={() => setShowPermissionsModal(true)}
                    class="w-full btn-secondary flex items-center justify-center gap-2"
                  >
                    <span>📝</span>
                    <span>Gestionar permisos</span>
                  </button>
                </div>

                <Show when={modalError()}>
                  <div
                    class="bg-red-500/10 border border-red-500/30 text-red-600 
                              dark:text-red-400 px-4 py-3 rounded-md text-sm"
                  >
                    {modalError()}
                  </div>
                </Show>

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
                      : editingRole()
                        ? "Actualizar"
                        : "Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        {/* Modal secundario Selector de permisos (PANTALLA COMPLETA) */}
        <Show when={showPermissionsModal()}>
          <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div
              class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 
                        rounded-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    Seleccionar permisos
                  </h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Para el rol:{" "}
                    <span class="font-medium">
                      {formDisplayName() || formName() || "nuevo rol"}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Body con scroll */}
              <div class="flex-1 overflow-y-auto p-6">
                <Show when={availablePermissions.loading}>
                  <div class="flex items-center justify-center h-64">
                    <div class="text-center">
                      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p class="text-gray-500 dark:text-gray-400">
                        Cargando permisos disponibles...
                      </p>
                    </div>
                  </div>
                </Show>

                <Show when={availablePermissions()}>
                  <PermissionSelector
                    availablePermissions={
                      availablePermissions()?.permissions || {}
                    }
                    selectedPermissions={formPermissions()}
                    onPermissionsChange={setFormPermissions}
                  />
                </Show>
              </div>

              {/* Footer */}
              <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <div class="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPermissionsModal(false)}
                    class="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPermissionsModal(false)}
                    class="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <span>✓</span>
                    <span>
                      Aplicar selección ({formPermissions().length} permisos)
                    </span>
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

export default Roles;
