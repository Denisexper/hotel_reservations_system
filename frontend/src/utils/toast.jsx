import { toast } from "solid-sonner";

export const showToast = {
  success: (message, options = {}) => {
    toast.success(message, {
      duration: 1000,
      ...options
    });
  },

  error: (message, options = {}) => {
    toast.error(message, {
      duration: 4000,
      ...options
    });
  },

  info: (message, options = {}) => {
    toast.info(message, {
      duration: 3000,
      ...options
    });
  },

  warning: (message, options = {}) => {
    toast.warning(message, {
      duration: 3000,
      ...options
    });
  },

  loading: (message) => {
    return toast.loading(message);
  },

  promise: (promise, messages) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error
    });
  },

  // Para confirmaciones
  confirm: (message, onConfirm) => {
    toast.custom((t) => (
      <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p class="text-sm text-gray-900 dark:text-white mb-3">{message}</p>
        <div class="flex gap-2">
          <button
            onClick={() => {
              onConfirm();
              toast.dismiss(t);
            }}
            class="btn-primary text-xs px-3 py-1.5"
          >
            Confirmar
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            class="btn-secondary text-xs px-3 py-1.5"
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  }
};