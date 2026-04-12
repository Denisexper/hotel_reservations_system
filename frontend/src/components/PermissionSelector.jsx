import { createSignal, createMemo, For, Show } from "solid-js";

function PermissionSelector(props) {
  // Props: availablePermissions, selectedPermissions, onPermissionsChange

  // Estados locales
  const [searchTerm, setSearchTerm] = createSignal("");
  const [activeTab, setActiveTab] = createSignal("all");
  const [expandedResources, setExpandedResources] = createSignal([]);

  // Obtener todos los recursos (categorías)
  const allResources = createMemo(() => {
    if (!props.availablePermissions) return [];
    return Object.keys(props.availablePermissions);
  });

  // Filtrar permisos por búsqueda
  const filteredBySearch = createMemo(() => {
    if (!props.availablePermissions) return {};

    const search = searchTerm().toLowerCase();
    if (!search) return props.availablePermissions;

    const filtered = {};
    Object.entries(props.availablePermissions).forEach(([resource, perms]) => {
      const matchingPerms = perms.filter(
        (perm) =>
          perm.description.toLowerCase().includes(search) ||
          perm.action.toLowerCase().includes(search) ||
          perm.code.toLowerCase().includes(search),
      );

      if (matchingPerms.length > 0) {
        filtered[resource] = matchingPerms;
      }
    });

    return filtered;
  });

  // Filtrar por categoría (tab)
  const filteredPermissions = createMemo(() => {
    const perms = filteredBySearch();

    if (activeTab() === "all") return perms;

    // Solo mostrar el recurso seleccionado
    if (perms[activeTab()]) {
      return { [activeTab()]: perms[activeTab()] };
    }

    return {};
  });

  // Alternar expansión de acordeón
  const toggleResource = (resource) => {
    if (expandedResources().includes(resource)) {
      setExpandedResources(expandedResources().filter((r) => r !== resource));
    } else {
      setExpandedResources([...expandedResources(), resource]);
    }
  };

  // Toggle individual permission
  const togglePermission = (code) => {
    const current = props.selectedPermissions || [];
    if (current.includes(code)) {
      props.onPermissionsChange(current.filter((p) => p !== code));
    } else {
      props.onPermissionsChange([...current, code]);
    }
  };

  // Toggle todos los permisos de un recurso
  const toggleAllInResource = (resource, perms) => {
    const permCodes = perms.map((p) => p.code);
    const current = props.selectedPermissions || [];

    const allSelected = permCodes.every((code) => current.includes(code));

    if (allSelected) {
      // Deseleccionar todos
      props.onPermissionsChange(
        current.filter((code) => !permCodes.includes(code)),
      );
    } else {
      // Seleccionar todos
      const newPerms = [...new Set([...current, ...permCodes])];
      props.onPermissionsChange(newPerms);
    }
  };

  // Seleccionar todos los visibles
  const selectAllVisible = () => {
    const current = props.selectedPermissions || [];
    const allVisible = Object.values(filteredPermissions())
      .flat()
      .map((p) => p.code);

    const newPerms = [...new Set([...current, ...allVisible])];
    props.onPermissionsChange(newPerms);
  };

  // Limpiar selección
  const clearSelection = () => {
    props.onPermissionsChange([]);
  };

  // Contador de permisos
  const permissionCount = createMemo(() => {
    if (!props.availablePermissions) return { selected: 0, total: 0 };

    const total = Object.values(props.availablePermissions).flat().length;
    const selected = (props.selectedPermissions || []).length;

    return { selected, total };
  });

  // Verificar si todos los permisos de un recurso están seleccionados
  const isResourceFullySelected = (perms) => {
    const current = props.selectedPermissions || [];
    return perms.every((p) => current.includes(p.code));
  };

  // Verificar si algunos (pero no todos) están seleccionados
  const isResourcePartiallySelected = (perms) => {
    const current = props.selectedPermissions || [];
    const selected = perms.filter((p) => current.includes(p.code)).length;
    return selected > 0 && selected < perms.length;
  };

  // Emoji por recurso
  const getResourceEmoji = (resource) => {
    const emojis = {
      users: "👥",
      roles: "🔐",
      logs: "📋",
      rooms: "🏨",
      reservations: "📅",
      payments: "💳",
      dashboard: "📊",
      hotel_reports: "📈",
      seasonal_prices: "🏷️",
      maintenance: "🔧",
    };
    return emojis[resource] || "📁";
  };

  return (
    <div class="space-y-4">
      {/* Header con contador */}
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Permisos ({permissionCount().selected} seleccionados de{" "}
          {permissionCount().total})
        </p>
        <Show when={permissionCount().selected > 0}>
          <button
            onClick={clearSelection}
            class="text-xs text-red-600 dark:text-red-400 hover:underline"
          >
            ✕ Limpiar
          </button>
        </Show>
      </div>

      {/* Barra de búsqueda */}
      <div class="relative">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, acción o código..."
          value={searchTerm()}
          onInput={(e) => setSearchTerm(e.target.value)}
          class="input-field w-full pl-4 pr-10"
        />
        <Show when={searchTerm()}>
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </Show>
      </div>

      {/* Tabs de categorías */}
      <div class="flex gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          class={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${activeTab() === "all"
              ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
        >
          Todos
        </button>
        <For each={allResources()}>
          {(resource) => (
            <button
              type="button"
              onClick={() => setActiveTab(resource)}
              class={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors capitalize ${activeTab() === resource
                  ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
            >
              {getResourceEmoji(resource)} {resource}
            </button>
          )}
        </For>
      </div>

      {/* Acordeones de permisos */}
      <div class="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
        <Show when={Object.keys(filteredPermissions()).length === 0}>
          <div class="p-8 text-center text-gray-500 dark:text-gray-400">
            <p class="text-sm">No se encontraron permisos</p>
            <Show when={searchTerm()}>
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                class="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
              >
                Limpiar búsqueda
              </button>
            </Show>
          </div>
        </Show>

        <For each={Object.entries(filteredPermissions())}>
          {([resource, perms]) => {
            const isExpanded = () => expandedResources().includes(resource);
            const isFullySelected = () => isResourceFullySelected(perms);
            const isPartiallySelected = () =>
              isResourcePartiallySelected(perms);

            return (
              <div class="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                {/* Header del acordeón */}
                <div class="bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3 flex-1">
                      {/* Checkbox select all */}
                      <input
                        type="checkbox"
                        checked={isFullySelected()}
                        indeterminate={isPartiallySelected()}
                        onChange={() => toggleAllInResource(resource, perms)}
                        class="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-700"
                      />

                      {/* Título del recurso */}
                      <button
                        onClick={() => toggleResource(resource)}
                        class="flex items-center gap-2 flex-1 text-left"
                      >
                        <span class="text-lg">
                          {getResourceEmoji(resource)}
                        </span>
                        <div>
                          <p class="text-sm font-semibold text-gray-900 dark:text-white uppercase">
                            {resource}
                          </p>
                          <p class="text-xs text-gray-500 dark:text-gray-400">
                            {
                              perms.filter((p) =>
                                (props.selectedPermissions || []).includes(
                                  p.code,
                                ),
                              ).length
                            }{" "}
                            de {perms.length} seleccionados
                          </p>
                        </div>
                      </button>

                      {/* Botón expand/collapse */}
                      <button
                        type="button"
                        onClick={() => toggleResource(resource)}
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-transform"
                        style={{
                          transform: isExpanded()
                            ? "rotate(90deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                </div>

                {/* Contenido del acordeón */}
                <Show when={isExpanded()}>
                  <div class="p-4 space-y-2">
                    <For each={perms}>
                      {(perm) => (
                        <label class="flex items-start gap-3 p-2 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                          <input
                            type="checkbox"
                            checked={(props.selectedPermissions || []).includes(
                              perm.code,
                            )}
                            onChange={() => togglePermission(perm.code)}
                            class="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-700 mt-0.5"
                          />
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 dark:text-white">
                              {perm.description}
                            </p>
                            <div class="flex items-center gap-2 mt-1">
                              <span class="text-xs text-gray-500 dark:text-gray-400">
                                {perm.action}
                              </span>
                              <span class="text-xs text-gray-400 dark:text-gray-600 font-mono">
                                {perm.code}
                              </span>
                            </div>
                          </div>
                        </label>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      {/* Botones de acción rápida */}
      <div class="flex gap-2">
        <button type="button" onClick={selectAllVisible} class="btn-secondary flex-1 text-xs">
          📋 Seleccionar todos
        </button>
        <button
          onClick={clearSelection}
          class="btn-secondary flex-1 text-xs"
          disabled={permissionCount().selected === 0}
        >
          🗑️ Limpiar selección
        </button>
      </div>
    </div>
  );
}

export default PermissionSelector;
