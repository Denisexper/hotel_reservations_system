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

  async register(name, email, password, role = "user") {
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

  //filtros de usuarios
  async getUsers(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/users${params ? `?${params}` : ""}`);
  }
}

export const api = new ApiService();
