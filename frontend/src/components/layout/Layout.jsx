import Sidebar from "./Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "@solidjs/router";

function Layout(props) {
  const auth = useAuth();
  const navigate = useNavigate();

  // Bloquear acceso al sistema para clientes
  if (auth.user()?.role === "cliente") {
    navigate("/");
    return null;
  }

  return (
    <div class="flex h-screen overflow-hidden bg-gray-50 dark:bg-black">
      <Sidebar />
      <main class="flex-1 overflow-y-auto">{props.children}</main>
    </div>
  );
}
export default Layout;