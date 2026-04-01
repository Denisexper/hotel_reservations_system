import { createSignal, createResource, Show, For } from "solid-js";
import { api } from "../services/api";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "@solidjs/router";
import { showToast } from "../utils/toast";
import Pagination from "../components/Pagination";

function Users() {
  const auth = useAuth();
  const navigate = useNavigate();

  // Verificar si tiene permiso para ver usuarios
  if (!auth.hasPermission("users.read")) {
    navigate("/dashboard");
    return null;
  }

  //paginacion
  const [currentPage, setCurrentPage] = createSignal(1);
  const [limit] = createSignal(10);

  const [searchInput, setSearchInput] = createSignal("");
  const [roleInput, setRoleInput] = createSignal("");
  const [statusInput, setStatusInput] = createSignal("");

  // Filtros aplicados (los que se usan en la búsqueda)
  const [appliedFilters, setAppliedFilters] = createSignal({
    search: "",
    role: "",
    isActive: "",
  });

  const [users, { refetch }] = createResource(
    () => ({
      ...appliedFilters(),
      page: currentPage(),
      limit: limit(),
    }),
    (params) => {
      const filters = {};
      if (params.search) filters.search = params.search;
      if (params.role) filters.role = params.role;
      if (params.isActive !== "" && params.isActive !== undefined) {
        filters.isActive = params.isActive;
      }
      filters.page = params.page;
      filters.limit = params.limit;
      return api.getUsers(filters);
    },
  );

  //Cargar roles disponibles
  const [roles] = createResource(() => api.getRoles());

  // Modal state
  const [showModal, setShowModal] = createSignal(false);
  const [editingUser, setEditingUser] = createSignal(null);
  const [modalLoading, setModalLoading] = createSignal(false);
  const [modalError, setModalError] = createSignal("");

  // Form state
  const [formName, setFormName] = createSignal("");
  const [formEmail, setFormEmail] = createSignal("");
  const [formPassword, setFormPassword] = createSignal("");
  const [formRole, setFormRole] = createSignal(""); // Ahora guardará el roleId

  const [showHistoryModal, setShowHistoryModal] = createSignal(false);
  const [selectedUser, setSelectedUser] = createSignal(null);
  const [history, { refetch: refetchHistory }] = createResource(
    () => selectedUser(),
    async (user) => {
      if (!user) return null;

      const result = await api.getUserHistory(user._id);

      return result;
    },
  );

  //funcion para abrir el historial de cada usuario en los logs
  const openHistory = (user) => {
    setSelectedUser(user);
    setShowHistoryModal(true);
  };

  // Aplicar filtros
  const applyFilters = () => {
    setAppliedFilters({
      search: searchInput(),
      role: roleInput(),
      isActive: statusInput(),
    });
    setCurrentPage(1);
  };

  // Limpiar filtros
  const clearFilters = () => {
    setSearchInput("");
    setRoleInput("");
    setStatusInput("");
    setAppliedFilters({
      search: "",
      role: "",
      isActive: "",
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const openCreate = () => {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    // uscar el rol "user" por defecto
    const defaultRole = roles()?.data?.find((r) => r.name === "user");
    setFormRole(defaultRole?._id || "");
    setModalError("");
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword("");
    // Establecer el roleId del usuario
    setFormRole(user.role?._id || user.role);
    setModalError("");
    setShowModal(true);
  };

  /* const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;
    try {
      await api.deleteUser(id);
      refetch();
    } catch (error) {
      alert(error.message);
    }
  }; */

  const toggleStatus = async (user) => {
    const action = user.isActive ? "desactivar" : "activar";
    showToast.confirm(
      `¿Estás seguro de ${action} a ${user.name}?`,
      async () => {
        try {
          await api.toggleUserStatus(user._id);
          refetch();
          showToast.success(
            `Usuario ${action === "desactivar" ? "desactivado" : "activado"} correctamente`,
          );
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
      if (editingUser()) {
        const data = {};
        if (formName()) data.name = formName();
        if (formEmail()) data.email = formEmail();
        if (formPassword()) data.password = formPassword();
        if (formRole()) data.role = formRole(); // role id
        await api.updateUser(editingUser()._id, data);
        showToast.success("Usuario actualizado correctamente");
      } else {
        await api.createUser({
          name: formName(),
          email: formEmail(),
          password: formPassword(),
          role: formRole(), // role id
        });
        showToast.success("Usuario creado correctamente");
      }
      setShowModal(false);
      refetch();
    } catch (error) {
      setModalError(error.message);
      showToast.error(error.message);
    }

    setModalLoading(false);
  };

  // Función para obtener color según rol
  const roleColor = (roleName) => {
    if (roleName === "admin")
      return "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400";
    if (roleName === "moderator")
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  };

  // Obtener el nombre del rol para mostrar
  const getRoleName = (user) => {
    if (typeof user.role === "string") return user.role;
    return user.role?.name || user.role?.displayName || "user";
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div class="p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div class="flex justify-between items-center mb-8">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                Usuarios
              </h1>
              <p class="text-gray-500 dark:text-gray-400 mt-1">
                Gestiona los usuarios del sistema
              </p>
            </div>
            {/* Solo mostrar si tiene permiso de crear */}
            <Show when={auth.hasPermission("users.create")}>
              <button onClick={openCreate} class="btn-primary">
                + Nuevo usuario
              </button>
            </Show>
          </div>

          {/*Barra de filtros */}
          <div class="card mb-6">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Filtros
            </p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Búsqueda por nombre/email */}
              <input
                type="text"
                class="input-field"
                placeholder="Buscar por nombre o email..."
                value={searchInput()}
                onInput={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && applyFilters()}
              />

              {/* Filtro por rol */}
              <Show
                when={!roles.loading && roles()}
                fallback={
                  <div class="input-field bg-gray-100 dark:bg-gray-800">
                    Cargando roles...
                  </div>
                }
              >
                <select
                  class="input-field"
                  value={roleInput()}
                  onChange={(e) => setRoleInput(e.target.value)}
                >
                  <option value="">Todos los roles</option>
                  <For each={roles()?.data}>
                    {(role) => (
                      <option value={role._id}>{role.displayName}</option>
                    )}
                  </For>
                </select>
              </Show>

              {/* Filtro por estado */}
              <select
                class="input-field"
                value={statusInput()}
                onChange={(e) => setStatusInput(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
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
            <Show when={users.loading}>
              <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                Cargando usuarios...
              </div>
            </Show>

            <Show when={users.error}>
              <div class="p-8 text-center text-red-500">
                Error al cargar usuarios
              </div>
            </Show>

            <Show when={users()}>
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-800">
                    <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Rol
                    </th>
                    <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Creado
                    </th>
                    {/* AGREGAR logs.read */}
                    <Show
                      when={
                        auth.hasPermission("users.update") ||
                        auth.hasPermission("logs.read")
                      }
                    >
                      <th class="px-6 py-3"></th>
                    </Show>
                  </tr>
                </thead>
                <tbody>
                  <For each={users()?.data}>
                    {(user) => (
                      <tr
                        class="border-b border-gray-100 dark:border-gray-800/50 
                                 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                      >
                        <td class="px-6 py-4">
                          <div class="flex items-center gap-3">
                            <div
                              class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 
                                        flex items-center justify-center flex-shrink-0"
                            >
                              <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                {user.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p class="text-sm font-medium text-gray-900 dark:text-white">
                                {user.name}
                              </p>
                              <p class="text-xs text-gray-500 dark:text-gray-400">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <span
                            class={`px-2 py-1 rounded-full text-xs font-medium ${roleColor(getRoleName(user))}`}
                          >
                            {getRoleName(user)}
                          </span>
                        </td>
                        <td class="px-6 py-4">
                          <div class="flex items-center gap-1.5">
                            <span
                              class={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-500"}`}
                            ></span>
                            <span class="text-xs text-gray-600 dark:text-gray-400">
                              {user.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        </td>
                        <td class="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString("es-ES")}
                        </td>
                        <td class="px-6 py-4">
                          <div class="flex items-center gap-2 justify-end">
                            <Show when={auth.hasPermission("logs.read")}>
                              <button
                                onClick={() => openHistory(user)}
                                class="text-xs px-3 py-1.5 rounded-md border border-blue-200 
               dark:border-blue-500/30 text-blue-600 dark:text-blue-400
               hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                              >
                                Historial
                              </button>
                            </Show>
                            {/* Botón Editar solo si tiene permiso */}
                            <Show when={auth.hasPermission("users.update")}>
                              <button
                                onClick={() => openEdit(user)}
                                class="text-xs px-3 py-1.5 rounded-md border border-gray-200 
               dark:border-gray-700 text-gray-600 dark:text-gray-400
               hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                              >
                                Editar
                              </button>
                            </Show>

                            {/* Botón Eliminar solo si tiene permiso */}
                            <Show when={auth.hasPermission("users.update")}>
                              <button
                                onClick={() => toggleStatus(user)}
                                class={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                                  user.isActive
                                    ? "border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                                    : "border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10"
                                }`}
                              >
                                {user.isActive ? "🔒 Desactivar" : "✅ Activar"}
                              </button>
                            </Show>
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>

              {/* Paginación */}
              <Show when={users()?.pagination}>
                <Pagination
                  currentPage={currentPage()}
                  totalPages={users().pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </Show>
            </Show>
          </div>
        </div>

        {/* Modal */}
        <Show when={showModal()}>
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
              class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 
                        rounded-xl w-full max-w-md shadow-xl"
            >
              <div
                class="flex justify-between items-center px-6 py-4 border-b 
                          border-gray-200 dark:border-gray-800"
              >
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingUser() ? "Editar usuario" : "Nuevo usuario"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} class="p-6 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    class="input-field w-full"
                    placeholder="Nombre completo"
                    value={formName()}
                    onInput={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    class="input-field w-full"
                    placeholder="correo@ejemplo.com"
                    value={formEmail()}
                    onInput={(e) => setFormEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {editingUser()
                      ? "Nueva contraseña (opcional)"
                      : "Contraseña"}
                  </label>
                  <input
                    type="password"
                    required={!editingUser()}
                    class="input-field w-full"
                    placeholder={
                      editingUser()
                        ? "Dejar vacío para no cambiar"
                        : "Mínimo 6 caracteres"
                    }
                    value={formPassword()}
                    onInput={(e) => setFormPassword(e.target.value)}
                  />
                </div>

                {/* Dropdown de roles dinámico */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rol
                  </label>
                  <Show
                    when={!roles.loading && roles()}
                    fallback={
                      <p class="text-xs text-gray-400">Cargando roles...</p>
                    }
                  >
                    <select
                      class="input-field w-full"
                      value={formRole()}
                      onChange={(e) => setFormRole(e.target.value)}
                      required
                    >
                      <option value="">Selecciona un rol</option>
                      <For each={roles()?.data}>
                        {(role) => (
                          <option value={role._id}>
                            {role.displayName} ({role.permissions?.length || 0}{" "}
                            permisos)
                          </option>
                        )}
                      </For>
                    </select>
                  </Show>
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
                      : editingUser()
                        ? "Actualizar"
                        : "Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>
        {/* MODAL DE HISTORIAL */}
        <Show when={showHistoryModal()}>
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
              class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 
                rounded-xl w-full max-w-3xl shadow-xl max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                    Historial de cambios
                  </h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedUser()?.name} ({selectedUser()?.email})
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div class="flex-1 overflow-y-auto p-6">
                <Show when={history.loading}>
                  <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                    Cargando historial...
                  </div>
                </Show>

                <Show when={history.error}>
                  <div class="text-center py-8 text-red-500">
                    Error al cargar el historial
                  </div>
                </Show>

                <Show when={history() && history().data}>
                  <Show
                    when={history().data.length > 0}
                    fallback={
                      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                        No hay cambios registrados para este usuario
                      </div>
                    }
                  >
                    <div class="space-y-4">
                      <For each={history().data}>
                        {(log) => (
                          <div class="card border-l-4 border-l-blue-500">
                            {/* Encabezado del cambio */}
                            <div class="flex justify-between items-start mb-3">
                              <div>
                                <p class="text-sm font-medium text-gray-900 dark:text-white">
                                  {log.action === "create" &&
                                    "✨ Usuario creado"}
                                  {log.action === "update" &&
                                    "✏️ Usuario actualizado"}
                                  {log.action === "delete" &&
                                    "🗑️ Usuario eliminado"}
                                </p>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Por {log.user?.name || "Sistema"} •{" "}
                                  {new Date(log.createdAt).toLocaleString(
                                    "es-ES",
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Cambios realizados */}
                            <Show
                              when={log.action === "create" && log.dataAfter}
                            >
                              <div class="bg-green-50 dark:bg-green-500/10 rounded-lg p-3 space-y-1">
                                <p class="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">
                                  Datos iniciales:
                                </p>
                                <Show when={log.dataAfter.name}>
                                  <p class="text-sm text-gray-700 dark:text-gray-300">
                                    <span class="font-medium">Nombre:</span>{" "}
                                    {log.dataAfter.name}
                                  </p>
                                </Show>
                                <Show when={log.dataAfter.email}>
                                  <p class="text-sm text-gray-700 dark:text-gray-300">
                                    <span class="font-medium">Email:</span>{" "}
                                    {log.dataAfter.email}
                                  </p>
                                </Show>
                                <Show when={log.dataAfter.role}>
                                  <p class="text-sm text-gray-700 dark:text-gray-300">
                                    <span class="font-medium">Rol:</span>{" "}
                                    {log.dataAfter.role}
                                  </p>
                                </Show>
                              </div>
                            </Show>

                            <Show
                              when={
                                log.action === "update" &&
                                log.changedFields &&
                                log.changedFields.length > 0
                              }
                            >
                              <div class="space-y-2">
                                <p class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                  Campos modificados:
                                </p>
                                <For each={log.changedFields}>
                                  {(field) => (
                                    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                      <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        {field === "name" && "Nombre"}
                                        {field === "email" && "Email"}
                                        {field === "role" && "Rol"}
                                        {field === "isActive" && "Estado"}
                                      </p>
                                      <div class="flex items-center gap-2">
                                        {/* ANTES - con formato para isActive */}
                                        <span class="text-sm text-red-600 dark:text-red-400 line-through">
                                          {field === "isActive"
                                            ? log.dataBefore?.[field]
                                              ? "Activo"
                                              : "Inactivo"
                                            : log.dataBefore?.[field] || "-"}
                                        </span>
                                        <span class="text-gray-400">→</span>
                                        {/* DESPUÉS - con formato para isActive */}
                                        <span class="text-sm text-green-600 dark:text-green-400 font-medium">
                                          {field === "isActive"
                                            ? log.dataAfter?.[field]
                                              ? "Activo"
                                              : "Inactivo"
                                            : log.dataAfter?.[field] || "-"}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </For>
                              </div>
                            </Show>

                            <Show
                              when={log.action === "delete" && log.dataBefore}
                            >
                              <div class="bg-red-50 dark:bg-red-500/10 rounded-lg p-3">
                                <p class="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">
                                  Usuario eliminado con los siguientes datos:
                                </p>
                                <div class="space-y-1">
                                  <Show when={log.dataBefore.name}>
                                    <p class="text-sm text-gray-700 dark:text-gray-300">
                                      <span class="font-medium">Nombre:</span>{" "}
                                      {log.dataBefore.name}
                                    </p>
                                  </Show>
                                  <Show when={log.dataBefore.email}>
                                    <p class="text-sm text-gray-700 dark:text-gray-300">
                                      <span class="font-medium">Email:</span>{" "}
                                      {log.dataBefore.email}
                                    </p>
                                  </Show>
                                </div>
                              </div>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </Show>
              </div>

              {/* Footer */}
              <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  class="btn-secondary w-full"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </Show>
      </Layout>
    </ProtectedRoute>
  );
}

export default Users;
