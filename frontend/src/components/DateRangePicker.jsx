import { createSignal, createEffect, Show, For } from "solid-js";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isBefore,
  isAfter,
  subDays,
  startOfToday,
} from "date-fns";
import { es } from "date-fns/locale";

function DateRangePicker(props) {
  const [showPicker, setShowPicker] = createSignal(false);
  const [currentMonth, setCurrentMonth] = createSignal(new Date());
  const [tempStartDate, setTempStartDate] = createSignal(null);
  const [tempEndDate, setTempEndDate] = createSignal(null);

  // Sincronizar con props cuando se abre el picker
  createEffect(() => {
    if (showPicker()) {
      setTempStartDate(props.startDate || null);
      setTempEndDate(props.endDate || null);
    }
  });

  const weekDays = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

  const getMonthDays = (date) => {
    const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const handleDayClick = (day) => {
    const today = startOfToday();
    if (isAfter(day, today)) return;

    const currentStart = tempStartDate();
    const currentEnd = tempEndDate();

    if (currentStart && currentEnd) {
      setTempStartDate(day);
      setTempEndDate(null);
      return;
    }

    if (!currentStart) {
      setTempStartDate(day);
      setTempEndDate(null);
      return;
    }

    if (currentStart && !currentEnd) {
      if (isBefore(day, currentStart)) {
        setTempEndDate(currentStart);
        setTempStartDate(day);
      } else {
        setTempEndDate(day);
      }
    }
  };

  const applyDateRange = () => {
    const start = tempStartDate();
    const end = tempEndDate();

    if (start && end) {
      props.onDateChange({
        startDate: start,
        endDate: end,
      });
      setShowPicker(false);
      if (props.onApply) props.onApply();
    }
  };

  const clearDates = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    props.onDateChange({ startDate: null, endDate: null });
    setShowPicker(false);
  };

  const applyPreset = (preset) => {
    const today = startOfToday();
    let start,
      end = today;

    switch (preset) {
      case "today":
        start = today;
        break;
      case "week":
        start = subDays(today, 7);
        break;
      case "month":
        start = subMonths(today, 1);
        break;
    }

    setTempStartDate(start);
    setTempEndDate(end);
    props.onDateChange({ startDate: start, endDate: end });
    setShowPicker(false);
    if (props.onApply) props.onApply();
  };

  const formatRange = () => {
    if (!props.startDate && !props.endDate)
      return "Seleccionar rango de fechas";
    if (props.startDate && !props.endDate)
      return `Desde ${format(props.startDate, "dd/MM/yyyy", { locale: es })}`;
    if (props.startDate && props.endDate) {
      return `${format(props.startDate, "dd/MM/yyyy", { locale: es })} - ${format(props.endDate, "dd/MM/yyyy", { locale: es })}`;
    }
    return "Seleccionar rango";
  };

  const getSelectionMessage = () => {
    const start = tempStartDate();
    const end = tempEndDate();

    if (!start) {
      return "📍 Selecciona fecha de inicio";
    } else if (!end) {
      return "📍 Selecciona fecha de fin";
    } else {
      return "✅ Aplicar o selecciona nuevas fechas";
    }
  };

  return (
    <div class="relative">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker())}
        class="input-field w-full text-left flex items-center justify-between gap-2"
      >
        <span
          class={
            props.startDate ? "text-gray-900 dark:text-white" : "text-gray-400"
          }
        >
          {formatRange()}
        </span>
        <span class="text-gray-400">📅</span>
      </button>

      <Show when={showPicker()}>
        <div
          class="absolute top-full left-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 
                    rounded-xl shadow-xl z-50 p-4 min-w-[320px]"
        >
          {/* Presets */}
          <div class="flex gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={() => applyPreset("today")}
              class="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 
                     text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => applyPreset("week")}
              class="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 
                     text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Última semana
            </button>
            <button
              type="button"
              onClick={() => applyPreset("month")}
              class="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 
                     text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Último mes
            </button>
          </div>

          {/* Navegación */}
          <div class="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth(), 1))}
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              ◀
            </button>
            <span class="font-semibold text-sm text-gray-900 dark:text-white capitalize">
              {format(currentMonth(), "MMMM yyyy", { locale: es })}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth(), 1))}
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              ▶
            </button>
          </div>

          {/* Días semana */}
          <div class="grid grid-cols-7 gap-1 mb-2">
            <For each={weekDays}>
              {(day) => (
                <div class="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-1">
                  {day}
                </div>
              )}
            </For>
          </div>

          {/* Calendario */}
          <div class="grid grid-cols-7 gap-1">
            <For each={getMonthDays(currentMonth())}>
              {(day) => {
                // ✅ Calcular estado dentro del For
                const getState = () => {
                  const start = tempStartDate();
                  const end = tempEndDate();
                  const today = startOfToday();

                  const isCurrentMonth = isSameMonth(day, currentMonth());
                  const isFuture = isAfter(day, today);
                  const isDisabled = !isCurrentMonth || isFuture;
                  const isStart = start && isSameDay(day, start);
                  const isEnd = end && isSameDay(day, end);
                  const isInRange =
                    start && end && isWithinInterval(day, { start, end });

                  return { isDisabled, isStart, isEnd, isInRange };
                };

                return (
                  <button
                    type="button"
                    onClick={() => {
                      const state = getState();
                      if (!state.isDisabled) handleDayClick(day);
                    }}
                    disabled={getState().isDisabled}
                    class={`
            p-2 text-xs rounded-md transition-colors
            ${getState().isDisabled ? "opacity-30 cursor-not-allowed text-gray-400" : ""}
            ${!getState().isDisabled && !getState().isStart && !getState().isEnd && !getState().isInRange ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800" : ""}
          `}
                    style={{
                      ...(getState().isStart || getState().isEnd
                        ? {
                            background: "#2563eb",
                            color: "white",
                            "font-weight": "bold",
                          }
                        : getState().isInRange
                          ? {
                              background: "#dbeafe",
                              color: "#1e40af",
                            }
                          : {}),
                    }}
                  >
                    {format(day, "d")}
                  </button>
                );
              }}
            </For>
          </div>

          {/* Footer */}
          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {getSelectionMessage()}
            </p>

            <div class="flex gap-2">
              <button
                type="button"
                onClick={clearDates}
                class="btn-secondary flex-1 text-xs"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={applyDateRange}
                disabled={!tempStartDate() || !tempEndDate()}
                class="btn-primary flex-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default DateRangePicker;
