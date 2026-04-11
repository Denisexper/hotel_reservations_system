import { Route, Router as SolidRouter } from "@solidjs/router";
import { lazy } from "solid-js";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "solid-sonner";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Users = lazy(() => import("./pages/Users"));
const Logs = lazy(() => import("./pages/Logs"));
const Roles = lazy(() => import("./pages/Roles"));
const Rooms = lazy(() => import("./pages/Rooms"));
const Reservations = lazy(() => import("./pages/Reservations"));
const Payments = lazy(() => import("./pages/Payments"));
const HotelReports = lazy(() => import("./pages/HotelReports"));
const SeasonalPrices = lazy(() => import("./pages/SeasonalPrices"));


function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton expand={false} />
        <SolidRouter>
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/users" component={Users} />
          <Route path="/logs" component={Logs} />
          <Route path="/roles" component={Roles} />
          <Route path="/rooms" component={Rooms} />
          <Route path="/reservations" component={Reservations} />
          <Route path="/payments" component={Payments} />
          <Route path="/hotel-reports" component={HotelReports} />
          <Route path="/seasonal-prices" component={SeasonalPrices} />
          <Route path="/" component={Login} />
        </SolidRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
