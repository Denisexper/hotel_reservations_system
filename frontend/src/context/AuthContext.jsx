import {
  createContext,
  useContext,
  createSignal,
  createEffect,
} from "solid-js";
import { api } from "../services/api";

const AuthContext = createContext();

export function AuthProvider(props) {
  const [user, setUser] = createSignal(null);
  const [loading, setLoading] = createSignal(true);
  const [initialized, setInitialized] = createSignal(false);

  createEffect(async () => {
    if (initialized()) return;

    const token = api.getToken();

    if (!token) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      const userData = await api.getMe();
      setUser(userData.data);
    } catch (error) {
      console.error("Error al verificar token:", error);
      api.removeToken();
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  });

  const login = async (email, password) => {
    try {
      const data = await api.login(email, password);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (name, email, password) => {
    try {
      const data = await api.register(name, email, password);
      setUser(data.newUser);
      return { success: true, user: data.newUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Error en logout:", error);
    } finally {
      api.removeToken();
      setUser(null);
    }
  };

  const isAdmin = () => user()?.role === "admin";
  const isModerator = () => user()?.role === "moderator" || isAdmin();

  const hasPermission = (permission) => {
    const userPermissions = user()?.permissions || [];
    return userPermissions.includes(permission);
  };

  const refreshUser = async () => {
    if (!api.getToken()) return;

    try {
      const userData = await api.getMe();
      setUser(userData.data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const isAuthenticated = () => !!user();

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAdmin,
    isModerator,
    hasPermission,
    refreshUser,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}