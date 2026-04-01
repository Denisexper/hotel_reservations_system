import { createSignal, createResource, Show, For } from "solid-js";
import { api } from "../services/api";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import DateRangePicker from "../components/DateRangePicker";
import Pagination from "../components/Pagination";

function Logs() {
  const auth = useAuth();

  //paginacion
  const [currentPage, setCurrentPage] = createSignal(1);
  const [limit] = createSignal(10); // Registros por página

  const [filters, setFilters] = createSignal({});
  const [logs, { refetch }] = createResource(
    () => ({ ...filters(), page: currentPage(), limit: limit() }),
    (params) => api.getLogs(params),
  );

  const [filterAction, setFilterAction] = createSignal("");
  const [filterResource, setFilterResource] = createSignal("");
  const [filterStartDate, setFilterStartDate] = createSignal(null);
  const [filterEndDate, setFilterEndDate] = createSignal(null);

  //filtros para ver cambios de los usuarios en los logs
  const [showDetailModal, setShowDetailModal] = createSignal(false);
  const [selectedLog, setSelectedLog] = createSignal(null);

  const [showExportMenu, setShowExportMenu] = createSignal(false);
  const [exporting, setExporting] = createSignal(false);

  const applyFilters = () => {
    const f = {};
    if (filterAction()) f.action = filterAction();
    if (filterResource()) f.resource = filterResource();

    if (filterStartDate() && filterEndDate()) {
      const startOfDay = new Date(filterStartDate());
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(filterEndDate());
      endOfDay.setHours(23, 59, 59, 999);

      f.startDate = startOfDay.toISOString();
      f.endDate = endOfDay.toISOString();
    }

    setCurrentPage(1);
    setFilters(f);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setFilterAction("");
    setFilterResource("");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilters({});
  };

  // Funcion para exportar excel
  const handleExportExcel = async (exportAll = true) => {
    setExporting(true);
    setShowExportMenu(false);

    try {
      const currentFilters = {
        ...filters(),
        exportAll: exportAll.toString(),
        page: exportAll ? undefined : currentPage(),
        limit: exportAll ? undefined : limit(),
      };

      const blob = await api.exportLogsToExcel(currentFilters);

      // Crear link de descarga
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs_${exportAll ? "completo" : "pagina-" + currentPage()}_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast.success(
        `Reporte Excel generado: ${exportAll ? logs()?.pagination?.totalRecords || 0 : logs()?.data?.length || 0} registros`,
      );
    } catch (error) {
      showToast.error(error.message || "Error al generar reporte Excel");
    } finally {
      setExporting(false);
    }
  };

  // Función para exportar a PDF
  const handleExportPDF = async (exportAll = true) => {
    setExporting(true);
    setShowExportMenu(false);

    try {
      const currentFilters = {
        ...filters(),
        exportAll: exportAll.toString(),
        page: exportAll ? undefined : currentPage(),
        limit: exportAll ? undefined : limit(),
      };

      const blob = await api.exportLogsToPDF(currentFilters);

      // Crear link de descarga
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs_${exportAll ? "completo" : "pagina-" + currentPage()}_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast.success(
        `Reporte PDF generado: ${exportAll ? logs()?.pagination?.totalRecords || 0 : logs()?.data?.length || 0} registros`,
      );
    } catch (error) {
      showToast.error(error.message || "Error al generar reporte PDF");
    } finally {
      setExporting(false);
    }
  };

  const openLogDetail = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handleDelete = async (id) => {
    showToast.confirm(
      "¿Eliminar este log? Esta acción no se puede deshacer.",
      async () => {
        try {
          await api.deleteLog(id);
          refetch();
          showToast.success("Log eliminado correctamente");
        } catch (error) {
          showToast.error(error.message);
        }
      },
    );
  };

  const handleDateChange = ({ startDate, endDate }) => {
    setFilterStartDate(startDate);
    setFilterEndDate(endDate);
  };

  const actionColor = (action) => {
    const colors = {
      login:
        "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
      logout: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      create:
        "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
      update:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
      delete: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
      read: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    };
    return (
      colors[action] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    );
  };

  const statusColor = (code) => {
    if (code >= 200 && code < 300) return "text-green-600 dark:text-green-400";
    if (code >= 400) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div class="p-8 max-w-7xl mx-auto">
          <div class="mb-8">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              Bitácoras
            </h1>
            <p class="text-gray-500 dark:text-gray-400 mt-1">
              Registro de actividad del sistema
            </p>
          </div>

          {/* Filtros */}
          <div class="card mb-6">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Filtros
            </p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                class="input-field"
                value={filterAction()}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="">Todas las acciones</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="create">Create</option>
                <option value="read">Read</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>

              <select
                class="input-field"
                value={filterResource()}
                onChange={(e) => setFilterResource(e.target.value)}
              >
                <option value="">Todos los recursos</option>
                <option value="users">Users</option>
                <option value="auth">Auth</option>
                <option value="logs">Logs</option>
              </select>

              <DateRangePicker
                startDate={filterStartDate()}
                endDate={filterEndDate()}
                onDateChange={handleDateChange}
                onApply={applyFilters}
              />
            </div>

            <div class="flex gap-3 mt-4">
              <button onClick={applyFilters} class="btn-primary">
                🔍 Buscar
              </button>
              <button onClick={clearFilters} class="btn-secondary">
                Limpiar
              </button>

              <Show when={auth.hasPermission("logs.export")}>
                <div class="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu())}
                    disabled={exporting()}
                    class="btn-secondary flex items-center gap-2"
                  >
                    <span>📥</span>
                    <span>{exporting() ? "Exportando..." : "Exportar"}</span>
                    <span class="text-xs">▼</span>
                  </button>

                  {/* Dropdown menu mejorado */}
                  <Show when={showExportMenu()}>
                    <div
                      class="absolute top-full left-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 
                    rounded-lg shadow-xl z-50 min-w-[300px]"
                    >
                      {/* Sección Excel */}
                      <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                          📊 Excel
                        </p>
                        <button
                          onClick={() => handleExportExcel(false)}
                          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 
                   hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-md mb-1"
                        >
                          <div class="flex justify-between items-center">
                            <span>Página actual</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                              ({logs()?.data?.length || 0} registros)
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleExportExcel(true)}
                          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 
                   hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-md"
                        >
                          <div class="flex justify-between items-center">
                            <span>Todos los filtrados</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                              ({logs()?.pagination?.totalRecords || 0}{" "}
                              registros)
                            </span>
                          </div>
                        </button>
                      </div>

                      {/* Sección PDF */}
                      <div class="px-3 py-2">
                        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                          📄 PDF
                        </p>
                        <button
                          onClick={() => handleExportPDF(false)}
                          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 
                   hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-md mb-1"
                        >
                          <div class="flex justify-between items-center">
                            <span>Página actual</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                              ({logs()?.data?.length || 0} registros)
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleExportPDF(true)}
                          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 
                   hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-md"
                        >
                          <div class="flex justify-between items-center">
                            <span>Todos los filtrados</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                              ({logs()?.pagination?.totalRecords || 0}{" "}
                              registros)
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          </div>

          {/* Tabla */}
          <div class="card overflow-hidden p-0">
            <Show when={logs.loading}>
              <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                Cargando bitácoras...
              </div>
            </Show>

            <Show when={logs()}>
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-gray-200 dark:border-gray-800">
                      <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Acción
                      </th>
                      <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Recurso
                      </th>
                      <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Usuario Afectado
                      </th>
                      <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Fecha
                      </th>
                      {/* Columna para botón "Ver" - siempre visible porque puede haber create/update/delete */}
                      <th class="px-6 py-3"></th>

                      {/* Columna para botón "Eliminar" - solo si tiene permiso */}
                      <Show when={auth.hasPermission("logs.delete")}>
                        <th class="px-6 py-3"></th>
                      </Show>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={logs()?.data}>
                      {(log) => (
                        <tr class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                          <td class="px-6 py-4">
                            <div>
                              <p class="text-sm font-medium text-gray-900 dark:text-white">
                                {log.user?.name || "Desconocido"}
                              </p>
                              <p class="text-xs text-gray-500 dark:text-gray-400">
                                {log.user?.email}
                              </p>
                            </div>
                          </td>
                          <td class="px-6 py-4">
                            <span
                              class={`px-2 py-1 rounded-full text-xs font-medium ${actionColor(log.action)}`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {log.resource}
                          </td>
                          <td class="px-6 py-4">
                            <Show
                              when={
                                log.targetUserName ||
                                log.targetUser ||
                                log.action === "logout"
                              }
                              fallback={
                                <span class="text-xs text-gray-400 italic">
                                  -
                                </span>
                              }
                            >
                              <div>
                                <p class="text-sm font-medium text-gray-900 dark:text-white">
                                  {log.action === "logout"
                                    ? log.user?.name
                                    : log.targetUserName ||
                                      log.targetUser?.name ||
                                      "Usuario"}
                                </p>
                                <Show
                                  when={
                                    log.action === "logout"
                                      ? log.user?.email
                                      : log.targetUser?.email
                                  }
                                >
                                  <p class="text-xs text-gray-500 dark:text-gray-400">
                                    {log.action === "logout"
                                      ? log.user?.email
                                      : log.targetUser?.email}
                                  </p>
                                </Show>
                              </div>
                            </Show>
                          </td>
                          <td class="px-6 py-4">
                            <span
                              class={`text-sm font-mono font-medium ${statusColor(log.statusCode)}`}
                            >
                              {log.statusCode}
                            </span>
                          </td>
                          <td class="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                            {new Date(log.createdAt).toLocaleString("es-ES")}
                          </td>
                          {/* NUEVO: Botón Ver detalles */}
                          <td class="px-6 py-4">
                            <Show
                              when={
                                auth.hasPermission("logs.read") &&
                                ["create", "update", "delete"].includes(
                                  log.action,
                                ) &&
                                (log.dataBefore || log.dataAfter)
                              }
                            >
                              <button
                                onClick={() => openLogDetail(log)}
                                class="text-xs px-3 py-1.5 rounded-md border border-blue-200 
             dark:border-blue-500/30 text-blue-600 dark:text-blue-400
             hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                              >
                                👁️ Ver
                              </button>
                            </Show>
                          </td>
                          {/*BOTÓN DE ELIMINAR */}
                          <Show when={auth.hasPermission("logs.delete")}>
                            <td class="px-6 py-4">
                              <button
                                onClick={() => handleDelete(log._id)}
                                class="text-xs px-3 py-1.5 rounded-md border border-red-200
                                       dark:border-red-500/30 text-red-600 dark:text-red-400
                                       hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              >
                                Eliminar
                              </button>
                            </td>
                          </Show>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <Show when={logs()?.pagination}>
                <Pagination
                  currentPage={currentPage()}
                  totalPages={logs().pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </Show>
            </Show>
          </div>
        </div>
      </Layout>
      {/* MODAL DE DETALLE DEL LOG */}
      <Show when={showDetailModal()}>
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 
                rounded-xl w-full max-w-2xl shadow-xl"
          >
            {/* Header */}
            <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Detalles del cambio
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedLog()?.action === "create" && "✨ Usuario creado"}
                  {selectedLog()?.action === "update" &&
                    "✏️ Usuario actualizado"}
                  {selectedLog()?.action === "delete" && "🗑️ Usuario eliminado"}
                  {" • "}
                  {new Date(selectedLog()?.createdAt).toLocaleString("es-ES")}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div class="p-6">
              {/* Información del responsable */}
              <div class="mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Realizado por:
                </p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedLog()?.user?.name || "Sistema"}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {selectedLog()?.user?.email || ""}
                </p>
              </div>

              {/* Usuario afectado */}
              <div class="mb-6">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Usuario afectado:
                </p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedLog()?.targetUserName || "Desconocido"}
                </p>
              </div>

              {/* CREATE */}
              <Show
                when={
                  selectedLog()?.action === "create" && selectedLog()?.dataAfter
                }
              >
                <div class="bg-green-50 dark:bg-green-500/10 rounded-lg p-4 space-y-2">
                  <p class="text-xs font-semibold text-green-700 dark:text-green-400 mb-3">
                    Datos iniciales:
                  </p>
                  <Show when={selectedLog()?.dataAfter.name}>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600 dark:text-gray-400">
                        Nombre:
                      </span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedLog()?.dataAfter.name}
                      </span>
                    </div>
                  </Show>
                  <Show when={selectedLog()?.dataAfter.email}>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600 dark:text-gray-400">
                        Email:
                      </span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedLog()?.dataAfter.email}
                      </span>
                    </div>
                  </Show>
                  <Show when={selectedLog()?.dataAfter.role}>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600 dark:text-gray-400">
                        Rol:
                      </span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedLog()?.dataAfter.role}
                      </span>
                    </div>
                  </Show>
                </div>
              </Show>

              {/* UPDATE */}
              <Show
                when={
                  selectedLog()?.action === "update" &&
                  selectedLog()?.changedFields &&
                  selectedLog()?.changedFields.length > 0
                }
              >
                <div class="space-y-3">
                  <p class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">
                    Campos modificados:
                  </p>
                  <For each={selectedLog()?.changedFields}>
                    {(field) => (
                      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                          {field === "name" && "Nombre"}
                          {field === "email" && "Email"}
                          {field === "role" && "Rol"}
                          {field === "isActive" && "Estado"}
                        </p>
                        <div class="flex items-center gap-3">
                          <span class="text-sm text-red-600 dark:text-red-400 line-through flex-1">
                            {field === "isActive"
                              ? selectedLog()?.dataBefore?.[field]
                                ? "Activo"
                                : "Inactivo"
                              : selectedLog()?.dataBefore?.[field] || "-"}
                          </span>
                          <span class="text-gray-400">→</span>
                          <span class="text-sm text-green-600 dark:text-green-400 font-medium flex-1 text-right">
                            {field === "isActive"
                              ? selectedLog()?.dataAfter?.[field]
                                ? "Activo"
                                : "Inactivo"
                              : selectedLog()?.dataAfter?.[field] || "-"}
                          </span>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              {/* DELETE */}
              <Show
                when={
                  selectedLog()?.action === "delete" &&
                  selectedLog()?.dataBefore
                }
              >
                <div class="bg-red-50 dark:bg-red-500/10 rounded-lg p-4 space-y-2">
                  <p class="text-xs font-semibold text-red-700 dark:text-red-400 mb-3">
                    Usuario eliminado:
                  </p>
                  <Show when={selectedLog()?.dataBefore.name}>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600 dark:text-gray-400">
                        Nombre:
                      </span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedLog()?.dataBefore.name}
                      </span>
                    </div>
                  </Show>
                  <Show when={selectedLog()?.dataBefore.email}>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600 dark:text-gray-400">
                        Email:
                      </span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedLog()?.dataBefore.email}
                      </span>
                    </div>
                  </Show>
                  <Show when={selectedLog()?.dataBefore.role}>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600 dark:text-gray-400">
                        Rol:
                      </span>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedLog()?.dataBefore.role}
                      </span>
                    </div>
                  </Show>
                </div>
              </Show>
            </div>

            {/* Footer */}
            <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setShowDetailModal(false)}
                class="btn-secondary w-full"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </Show>
    </ProtectedRoute>
  );
}

export default Logs;
