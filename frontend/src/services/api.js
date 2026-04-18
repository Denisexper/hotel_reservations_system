const API_URL = "http://localhost:4000/api";

class ApiService {
  constructor() {
    this.baseURL = API_URL;
  }

  getToken() {
    return localStorage.getItem("token");
  }

  setToken(token) {
    localStorage.setItem("token", token);
  }

  removeToken() {
    localStorage.removeItem("token");
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();

    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msj || "Error en la petición");
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // Método para enviar FormData (imágenes + datos)
  // No envía Content-Type para que el browser ponga multipart/form-data con boundary
  async requestFormData(endpoint, formData, method = "POST") {
    const token = this.getToken();

    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method,
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msj || "Error en la petición");
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // Auth
  async login(email, password) {
    const data = await this.request("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  async getMe() {
    return this.request("/me");
  }

  async register(name, email, password, role = "cliente") {
    const data = await this.request("/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    });

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  async logout() {
    return this.request("/logout", {
      method: "POST",
    });
  }

  // Users actualizado para paginacion
  async getUsers(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/users${params ? `?${params}` : ""}`);
  }

  async createUser(userData) {
    return this.request("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: "DELETE",
    });
  }

  // Logs
  async getLogs(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/logs${params ? `?${params}` : ""}`);
  }

  async deleteLog(id) {
    return this.request(`/logs/${id}`, {
      method: "DELETE",
    });
  }

  async exportLogsToExcel(filters = {}) {
    const token = this.getToken();
    const params = new URLSearchParams(filters).toString();

    const response = await fetch(
      `${this.baseURL}/logs/reports/excel${params ? `?${params}` : ""}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Error al generar reporte Excel");
    }

    // Retornar el blob para descarga
    return response.blob();
  }

  async exportLogsToPDF(filters = {}) {
    const token = this.getToken();
    const params = new URLSearchParams(filters).toString();

    const response = await fetch(
      `${this.baseURL}/logs/reports/pdf${params ? `?${params}` : ""}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Error al generar reporte PDF");
    }

    // Retornar el blob para descarga
    return response.blob();
  }

  // Roles
  async getRoles(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.request(`/roles${queryParams ? `?${queryParams}` : ""}`);
  }

  async getRole(id) {
    return this.request(`/roles/${id}`);
  }

  async getPermissions() {
    return this.request("/roles/permissions");
  }

  async createRole(roleData) {
    return this.request("/roles", {
      method: "POST",
      body: JSON.stringify(roleData),
    });
  }

  async updateRole(id, roleData) {
    return this.request(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(roleData),
    });
  }

  async deleteRole(id) {
    return this.request(`/roles/${id}`, {
      method: "DELETE",
    });
  }

  // Obtener historial de un usuario en los logs
  async getUserHistory(userId) {
    return this.request(`/users/${userId}/history`);
  }

  // Activar/Desactivar usuario
  async toggleUserStatus(id) {
    return this.request(`/users/${id}/toggle-status`, {
      method: "PATCH",
    });
  }

  // ============================================
  // ROOMS (Habitaciones)
  // ============================================

  // Listar habitaciones con filtros y paginación
  async getRooms(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/rooms${params ? `?${params}` : ""}`);
  }

  // Obtener una habitación por ID
  async getRoom(id) {
    return this.request(`/rooms/${id}`);
  }

  // Crear habitación (con imágenes via FormData)
  async createRoom(formData) {
    return this.requestFormData("/rooms", formData, "POST");
  }

  // Actualizar habitación (con imágenes opcionales via FormData)
  async updateRoom(id, formData) {
    return this.requestFormData(`/rooms/${id}`, formData, "PUT");
  }

  // Eliminar habitación (soft delete)
  async deleteRoom(id) {
    return this.request(`/rooms/${id}`, {
      method: "DELETE",
    });
  }

  // Reactivar habitación (isActive: true)
  async reactivateRoom(id) {
    return this.requestFormData(`/rooms/${id}`, (() => {
      const fd = new FormData();
      fd.append("isActive", "true");
      return fd;
    })(), "PUT");
  }

  // Eliminar una imagen específica de una habitación
  async deleteRoomImage(roomId, imageIndex) {
    return this.request(`/rooms/${roomId}/images/${imageIndex}`, {
      method: "DELETE",
    });
  }

  // Buscar habitaciones disponibles (para reservas)
  async searchAvailableRooms(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/rooms/available${params ? `?${params}` : ""}`);
  }

  // ============================================
  // RESERVATIONS (Reservas)
  // ============================================

  // Listar todas las reservas (staff)
  async getReservations(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/reservations${params ? `?${params}` : ""}`);
  }

  // Mis reservas (cliente)
  async getMyReservations(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/reservations/my-reservations${params ? `?${params}` : ""}`);
  }

  // Obtener detalle de una reserva
  async getReservation(id) {
    return this.request(`/reservations/${id}`);
  }

  // Crear reserva
  async createReservation(reservationData) {
    return this.request("/reservations", {
      method: "POST",
      body: JSON.stringify(reservationData),
    });
  }

  // Actualizar reserva
  async updateReservation(id, reservationData) {
    return this.request(`/reservations/${id}`, {
      method: "PUT",
      body: JSON.stringify(reservationData),
    });
  }

  // Cancelar reserva
  async cancelReservation(id, reason) {
    return this.request(`/reservations/cancel/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  }

  // Check-in
  async checkIn(id) {
    return this.request(`/reservations/${id}/check-in`, {
      method: "PATCH",
    });
  }

  // Check-out
  async checkOut(id) {
    return this.request(`/reservations/${id}/check-out`, {
      method: "PATCH",
    });
  }

  // Verificar disponibilidad
  async checkAvailability(roomId, checkIn, checkOut) {
    const params = new URLSearchParams({ roomId, checkIn, checkOut }).toString();
    return this.request(`/reservations/check-availability?${params}`);
  }

  // ============================================
  // PAYMENTS (Pagos)
  // ============================================

  // Listar pagos
  async getPayments(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/payments${params ? `?${params}` : ""}`);
  }

  // Obtener pago por ID
  async getPayment(id) {
    return this.request(`/payments/${id}`);
  }

  // Pagos de una reserva
  async getPaymentsByReservation(reservationId) {
    return this.request(`/payments/reservation/${reservationId}`);
  }

  // Registrar pago
  async createPayment(paymentData) {
    return this.request("/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  }

  // Reembolsar pago
  async refundPayment(id, reason) {
    return this.request(`/payments/${id}/refund`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  }

  // Descargar comprobante PDF
  async downloadReceipt(paymentId) {
    const token = this.getToken();
    const response = await fetch(`${this.baseURL}/payments/${paymentId}/receipt`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error al descargar comprobante");
    }

    return response.blob();
  }


  // ============================================
  // DASHBOARD
  // ============================================

  async getDashboardStats() {
    return this.request("/dashboard/stats");
  }

  async getDashboardRevenue(period = "monthly", year = new Date().getFullYear()) {
    return this.request(`/dashboard/revenue?period=${period}&year=${year}`);
  }

  async getDashboardReservationsByStatus() {
    return this.request("/dashboard/reservations-by-status");
  }

  async getDashboardTopRooms(limit = 5) {
    return this.request(`/dashboard/top-rooms?limit=${limit}`);
  }

  async getDashboardToday() {
    return this.request("/dashboard/today");
  }

  async getDashboardOccupancy(days = 30) {
    return this.request(`/dashboard/occupancy?days=${days}`);
  }

  async getDashboardRevenueByMethod() {
    return this.request("/dashboard/revenue-by-method");
  }

  async exportDashboardExcel() {
    const token = this.getToken();
    const response = await fetch(`${this.baseURL}/dashboard/export/excel`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Error al exportar Excel");
    return response.blob();
  }

  async exportDashboardPDF() {
    const token = this.getToken();
    const response = await fetch(`${this.baseURL}/dashboard/export/pdf`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Error al exportar PDF");
    return response.blob();
  }

  // ============================================
  // SEASONAL PRICES (Temporadas de Precios)
  // ============================================

  async getSeasonalPrices(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/seasonal-prices${params ? `?${params}` : ""}`);
  }

  async getSeasonalPrice(id) {
    return this.request(`/seasonal-prices/${id}`);
  }

  async createSeasonalPrice(data) {
    return this.request("/seasonal-prices", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSeasonalPrice(id, data) {
    return this.request(`/seasonal-prices/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteSeasonalPrice(id) {
    return this.request(`/seasonal-prices/${id}`, {
      method: "DELETE",
    });
  }

  async checkSeasonalPrice(roomId, checkIn) {
    const params = new URLSearchParams({ roomId, checkIn }).toString();
    return this.request(`/seasonal-prices/check-price?${params}`);
  }

  // ============================================
  // MAINTENANCE (Mantenimiento)
  // ============================================

  async getMaintenanceTickets(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/maintenance${params ? `?${params}` : ""}`);
  }

  async getMaintenanceTicket(id) {
    return this.request(`/maintenance/${id}`);
  }

  async getMaintenanceByRoom(roomId) {
    return this.request(`/maintenance/room/${roomId}`);
  }

  async createMaintenanceTicket(data) {
    return this.request("/maintenance", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateMaintenanceTicket(id, data) {
    return this.request(`/maintenance/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteMaintenanceTicket(id) {
    return this.request(`/maintenance/${id}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // LOYALTY (Fidelidad)
  // ============================================

  async getTopClients(limit = 10) {
    return this.request(`/dashboard/top-clients?limit=${limit}`);
  }

  async getMyLoyalty() {
    return this.request("/dashboard/my-loyalty");
  }

  // ============================================
  // DAY PASS
  // ============================================

  async getDayPasses(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/daypass${params ? `?${params}` : ""}`);
  }

  async getDayPassToday() {
    return this.request("/daypass/today");
  }

  async getDayPass(id) {
    return this.request(`/daypass/${id}`);
  }

  async createDayPass(data) {
    return this.request("/daypass", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateDayPass(id, data) {
    return this.request(`/daypass/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async payDayPass(id, data) {
    return this.request(`/daypass/${id}/pay`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async checkoutDayPass(id) {
    return this.request(`/daypass/${id}/checkout`, {
      method: "PATCH",
    });
  }

  async cancelDayPass(id, reason) {
    return this.request(`/daypass/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  }
}

export const api = new ApiService();