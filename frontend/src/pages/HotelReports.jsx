import { createSignal, Show, For, onMount } from "solid-js";
import { api } from "../services/api";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "@solidjs/router";
import { showToast } from "../utils/toast";
import { Chart, Title, Tooltip, Legend, Colors } from "chart.js";
import { Bar, Doughnut, Line } from "solid-chartjs";
import {
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Filler,
} from "chart.js";

Chart.register(
  Title, Tooltip, Legend, Colors,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Filler,
);

const STATUS_COLORS = {
  pendiente: "#f59e0b",
  confirmada: "#3b82f6",
  "check-in": "#10b981",
  "check-out": "#6366f1",
  cancelada: "#ef4444",
};

const METHOD_COLORS = {
  efectivo: "#10b981",
  tarjeta: "#3b82f6",
  transferencia: "#8b5cf6",
};

function HotelReports() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (!auth.hasPermission("hotel_reports.read")) {
    navigate("/dashboard");
    return null;
  }

  const hasFullStats = () => auth.hasPermission("hotel_reports.read");

  const [stats, setStats] = createSignal(null);
  const [revenue, setRevenue] = createSignal([]);
  const [reservationsByStatus, setReservationsByStatus] = createSignal([]);
  const [topRooms, setTopRooms] = createSignal([]);
  const [todayActivity, setTodayActivity] = createSignal(null);
  const [occupancy, setOccupancy] = createSignal([]);
  const [revenueByMethod, setRevenueByMethod] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [exportLoading, setExportLoading] = createSignal("");

  onMount(async () => {
    try {
      if (hasFullStats()) {
        const [statsRes, revenueRes, statusRes, topRes, todayRes, occupancyRes, methodRes] = await Promise.all([
          api.getDashboardStats(), api.getDashboardRevenue(), api.getDashboardReservationsByStatus(),
          api.getDashboardTopRooms(), api.getDashboardToday(), api.getDashboardOccupancy(), api.getDashboardRevenueByMethod(),
        ]);
        setStats(statsRes.data); setRevenue(revenueRes.data || []); setReservationsByStatus(statusRes.data || []);
        setTopRooms(topRes.data || []); setTodayActivity(todayRes.data); setOccupancy(occupancyRes.data || []);
        setRevenueByMethod(methodRes.data || []);
      } else {
        const [statsRes, todayRes] = await Promise.all([
          api.getDashboardStats().catch(() => null), api.getDashboardToday().catch(() => null),
        ]);
        if (statsRes) setStats(statsRes.data);
        if (todayRes) setTodayActivity(todayRes.data);
      }
    } catch (error) {
      showToast.error("Error al cargar el dashboard");
    }
    setLoading(false);
  });

  const exportFile = async (type) => {
    setExportLoading(type);
    try {
      const blob = type === "excel" ? await api.exportDashboardExcel() : await api.exportDashboardPDF();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_hotel.${type === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast.success(`Reporte ${type.toUpperCase()} descargado`);
    } catch (error) { showToast.error(error.message); }
    setExportLoading("");
  };

  const formatPrice = (price) => new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(price || 0);

  const formatDate = (date) => {
    if (!date) return "—";
    const d = typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(date + "T12:00:00") : new Date(date);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  };

  // Chart data builders
  const revenueChartData = () => ({
    labels: revenue().map((r) => r.month),
    datasets: [{
      label: "Ingresos", data: revenue().map((r) => r.total),
      backgroundColor: "rgba(59, 130, 246, 0.7)", borderColor: "#3b82f6", borderWidth: 1, borderRadius: 4,
    }],
  });

  const revenueChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `Ingresos: ${formatPrice(ctx.raw)}` } } },
    scales: {
      y: { ticks: { callback: (v) => `$${v}`, color: "#9ca3af", font: { size: 11 } }, grid: { color: "rgba(156,163,175,0.15)" } },
      x: { ticks: { color: "#9ca3af", font: { size: 11 } }, grid: { display: false } },
    },
  };

  const statusChartData = () => ({
    labels: reservationsByStatus().map((s) => s.label),
    datasets: [{ data: reservationsByStatus().map((s) => s.count), backgroundColor: reservationsByStatus().map((s) => STATUS_COLORS[s.status] || "#6b7280"), borderWidth: 0 }],
  });

  const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  const occupancyChartData = () => ({
    labels: occupancy().map((o) => formatDate(o.date)),
    datasets: [{
      label: "Ocupación %", data: occupancy().map((o) => o.rate),
      borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", borderWidth: 2,
      pointRadius: 0, pointHoverRadius: 4, fill: true, tension: 0.3,
    }],
  });

  const occupancyOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `Ocupación: ${ctx.raw}%` } } },
    scales: {
      y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%`, color: "#9ca3af", font: { size: 11 } }, grid: { color: "rgba(156,163,175,0.15)" } },
      x: { ticks: { color: "#9ca3af", font: { size: 10 }, maxTicksLimit: 8 }, grid: { display: false } },
    },
  };

  const methodChartData = () => ({
    labels: revenueByMethod().map((m) => m.label),
    datasets: [{ data: revenueByMethod().map((m) => m.total), backgroundColor: revenueByMethod().map((m) => METHOD_COLORS[m.method] || "#6b7280"), borderWidth: 0 }],
  });

  const methodPieOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatPrice(ctx.raw)}` } } },
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div class="p-8 max-w-7xl mx-auto">
          <div class="flex justify-between items-center mb-8">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Reportes del Hotel</h1>
              <p class="text-gray-500 dark:text-gray-400 mt-1">{hasFullStats() ? "Estadísticas y reportes del hotel" : "Actividad del día"}</p>
            </div>
            <Show when={hasFullStats() && auth.hasPermission("hotel_reports.read")}>
              <div class="flex gap-2">
                <button onClick={() => exportFile("excel")} disabled={exportLoading() === "excel"} class="btn-secondary disabled:opacity-50">
                  {exportLoading() === "excel" ? "Exportando..." : "Excel"}
                </button>
                <button onClick={() => exportFile("pdf")} disabled={exportLoading() === "pdf"} class="btn-secondary disabled:opacity-50">
                  {exportLoading() === "pdf" ? "Exportando..." : "PDF"}
                </button>
              </div>
            </Show>
          </div>

          <Show when={!loading()} fallback={
            <div class="text-center py-16 text-gray-500 dark:text-gray-400">
              <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
              <p>Cargando reportes...</p>
            </div>
          }>
            {/* TARJETAS */}
            <Show when={stats()}>
              <div class={`grid gap-4 mb-8 ${hasFullStats() ? "grid-cols-1 md:grid-cols-4" : "grid-cols-1 md:grid-cols-2"}`}>
                <div class="card">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Habitaciones</p>
                    <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  </div>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">{stats().rooms.occupied}/{stats().rooms.total}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Ocupación: {stats().rooms.occupancyRate}%</p>
                  <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                    <div class="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${stats().rooms.occupancyRate}%` }} />
                  </div>
                </div>
                <Show when={hasFullStats()}>
                  <div class="card">
                    <div class="flex items-center justify-between mb-2">
                      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reservas del mes</p>
                      <svg class="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">{stats().reservations.thisMonth}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats().reservations.active} activas • {stats().reservations.pendingPayments} pagos pendientes</p>
                  </div>
                </Show>
                <Show when={hasFullStats()}>
                  <div class="card">
                    <div class="flex items-center justify-between mb-2">
                      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ingresos del mes</p>
                      <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(stats().revenue.thisMonth)}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Total acumulado: {formatPrice(stats().revenue.total)}</p>
                  </div>
                </Show>
                <div class="card">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Hoy</p>
                    <svg class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div class="flex gap-4">
                    <div>
                      <p class="text-2xl font-bold text-green-600 dark:text-green-400">{stats().today.checkIns}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">Check-ins</p>
                    </div>
                    <div>
                      <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats().today.checkOuts}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">Check-outs</p>
                    </div>
                  </div>
                </div>
              </div>
            </Show>

            {/* GRÁFICOS */}
            <Show when={hasFullStats()}>
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <div class="card lg:col-span-2">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Ingresos Mensuales {new Date().getFullYear()}</p>
                  <Show when={revenue().length > 0} fallback={<p class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Sin datos de ingresos</p>}>
                    <div style={{ height: "280px" }}><Bar data={revenueChartData()} options={revenueChartOptions} /></div>
                  </Show>
                </div>
                <div class="card">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Reservas por Estado</p>
                  <Show when={reservationsByStatus().length > 0} fallback={<p class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Sin datos</p>}>
                    <div style={{ height: "220px" }}><Doughnut data={statusChartData()} options={pieOptions} /></div>
                    <div class="flex flex-wrap gap-2 mt-3 justify-center">
                      <For each={reservationsByStatus()}>
                        {(entry) => (
                          <div class="flex items-center gap-1">
                            <div class="w-2.5 h-2.5 rounded-full" style={{ "background-color": STATUS_COLORS[entry.status] || "#6b7280" }} />
                            <span class="text-xs text-gray-600 dark:text-gray-400">{entry.label} ({entry.count})</span>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <div class="card lg:col-span-2">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Ocupación últimos 30 días</p>
                  <Show when={occupancy().length > 0} fallback={<p class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Sin datos</p>}>
                    <div style={{ height: "280px" }}><Line data={occupancyChartData()} options={occupancyOptions} /></div>
                  </Show>
                </div>
                <div class="card">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Ingresos por Método</p>
                  <Show when={revenueByMethod().length > 0} fallback={<p class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Sin datos</p>}>
                    <div style={{ height: "220px" }}><Doughnut data={methodChartData()} options={methodPieOptions} /></div>
                    <div class="space-y-1 mt-3">
                      <For each={revenueByMethod()}>
                        {(entry) => (
                          <div class="flex items-center justify-between text-xs">
                            <div class="flex items-center gap-1.5">
                              <div class="w-2.5 h-2.5 rounded-full" style={{ "background-color": METHOD_COLORS[entry.method] || "#6b7280" }} />
                              <span class="text-gray-600 dark:text-gray-400">{entry.label}</span>
                            </div>
                            <span class="font-medium text-gray-900 dark:text-white">{formatPrice(entry.total)}</span>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              </div>

              <div class="card mb-4">
                <p class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Top 5 Habitaciones Más Reservadas</p>
                <Show when={topRooms().length > 0} fallback={<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Sin datos</p>}>
                  <div class="overflow-x-auto">
                    <table class="w-full">
                      <thead>
                        <tr class="border-b border-gray-200 dark:border-gray-800">
                          <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">#</th>
                          <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Habitación</th>
                          <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
                          <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reservas</th>
                          <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ingresos</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={topRooms()}>
                          {(room, index) => (
                            <tr class="border-b border-gray-100 dark:border-gray-800/50">
                              <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index() + 1}</td>
                              <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">#{room.roomNumber}</td>
                              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{room.type}</td>
                              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{room.totalReservations}</td>
                              <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{formatPrice(room.totalRevenue)}</td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </div>
            </Show>

            {/* ACTIVIDAD DEL DÍA */}
            <Show when={todayActivity()}>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div class="card">
                  <div class="flex items-center gap-2 mb-4">
                    <div class="w-2 h-2 rounded-full bg-green-500" />
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">Check-ins de hoy ({todayActivity().checkIns.count})</p>
                  </div>
                  <Show when={todayActivity().checkIns.reservations.length > 0} fallback={<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No hay check-ins programados para hoy</p>}>
                    <div class="space-y-2">
                      <For each={todayActivity().checkIns.reservations}>
                        {(res) => (
                          <div class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <div>
                              <p class="text-sm font-medium text-gray-900 dark:text-white">{res.client?.name}</p>
                              <p class="text-xs text-gray-500 dark:text-gray-400">{res.client?.email}</p>
                            </div>
                            <div class="text-right">
                              <p class="text-sm font-medium text-gray-900 dark:text-white">#{res.room?.roomNumber}</p>
                              <p class="text-xs text-gray-500 dark:text-gray-400">{res.room?.type} • Piso {res.room?.floor || "—"}</p>
                            </div>
                            <span class={`text-xs px-2 py-1 rounded-full font-medium ${res.status === "check-in" ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"}`}>
                              {res.status === "check-in" ? "Registrado" : "Pendiente"}
                            </span>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
                <div class="card">
                  <div class="flex items-center gap-2 mb-4">
                    <div class="w-2 h-2 rounded-full bg-purple-500" />
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">Check-outs de hoy ({todayActivity().checkOuts.count})</p>
                  </div>
                  <Show when={todayActivity().checkOuts.reservations.length > 0} fallback={<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No hay check-outs programados para hoy</p>}>
                    <div class="space-y-2">
                      <For each={todayActivity().checkOuts.reservations}>
                        {(res) => (
                          <div class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <div>
                              <p class="text-sm font-medium text-gray-900 dark:text-white">{res.client?.name}</p>
                              <p class="text-xs text-gray-500 dark:text-gray-400">{res.client?.email}</p>
                            </div>
                            <div class="text-right">
                              <p class="text-sm font-medium text-gray-900 dark:text-white">#{res.room?.roomNumber}</p>
                              <p class="text-xs text-gray-500 dark:text-gray-400">{res.room?.type} • Piso {res.room?.floor || "—"}</p>
                            </div>
                            <span class="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">Salida</span>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              </div>
            </Show>
          </Show>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

export default HotelReports;