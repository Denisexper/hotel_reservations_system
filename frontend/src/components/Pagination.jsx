import { For } from "solid-js";

function Pagination(props) {
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (props.totalPages <= maxVisible) {
      // Mostrar todas las páginas
      for (let i = 1; i <= props.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Lógica para mostrar páginas con "..."
      if (props.currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', props.totalPages);
      } else if (props.currentPage >= props.totalPages - 2) {
        pages.push(1, '...', props.totalPages - 3, props.totalPages - 2, props.totalPages - 1, props.totalPages);
      } else {
        pages.push(1, '...', props.currentPage - 1, props.currentPage, props.currentPage + 1, '...', props.totalPages);
      }
    }

    return pages;
  };

  return (
    <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800">
      {/* Info */}
      <div class="text-sm text-gray-500 dark:text-gray-400">
        Página {props.currentPage} de {props.totalPages}
      </div>

      {/* Botones */}
      <div class="flex items-center gap-2">
        {/* Anterior */}
        <button
          type="button"
          onClick={() => props.onPageChange(props.currentPage - 1)}
          disabled={props.currentPage === 1}
          class="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 
                 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
                 text-gray-700 dark:text-gray-300 transition-colors"
        >
          Anterior
        </button>

        {/* Números de página */}
        <For each={getPageNumbers()}>
          {(page) => (
            <>
              {page === '...' ? (
                <span class="px-2 text-gray-400">...</span>
              ) : (
                <button
                  type="button"
                  onClick={() => props.onPageChange(page)}
                  class={`
                    px-3 py-1.5 text-sm rounded-md transition-colors
                    ${page === props.currentPage
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {page}
                </button>
              )}
            </>
          )}
        </For>

        {/* Siguiente */}
        <button
          type="button"
          onClick={() => props.onPageChange(props.currentPage + 1)}
          disabled={props.currentPage === props.totalPages}
          class="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 
                 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
                 text-gray-700 dark:text-gray-300 transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

export default Pagination;