import { For, Show } from "solid-js";

function PermissionBadges(props) {
  // props: permissions (array de códigos), availablePermissions (objeto agrupado)

  const getPermissionInfo = (code) => {
    if (!props.availablePermissions) return null;

    for (const [resource, perms] of Object.entries(props.availablePermissions)) {
      const perm = perms.find(p => p.code === code);
      if (perm) return { resource, ...perm };
    }
    return null;
  };

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
    <div class="flex flex-wrap gap-1.5">
      <Show when={props.permissions.length === 0}>
        <span class="text-sm text-gray-500 dark:text-gray-400 italic">
          No hay permisos seleccionados
        </span>
      </Show>

      <For each={props.permissions.slice(0, 15)}>
        {(code) => {
          const info = getPermissionInfo(code);
          return (
            <span class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md 
                         bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400
                         border border-blue-200 dark:border-blue-500/20">
              <span>{info ? getResourceEmoji(info.resource) : "📁"}</span>
              <span class="font-medium">{info?.action || code}</span>
            </span>
          );
        }}
      </For>

      <Show when={props.permissions.length > 15}>
        <span class="inline-flex items-center text-xs px-2.5 py-1 rounded-md 
                     bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          +{props.permissions.length - 15} más
        </span>
      </Show>
    </div>
  );
}

export default PermissionBadges;