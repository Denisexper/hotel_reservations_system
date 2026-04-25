import { Route, Router as SolidRouter } from "@solidjs/router";
import { lazy } from "solid-js";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "solid-sonner";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Users = lazy(() => import("./pages/Users"));
const Logs = lazy(() => import("./pages/Logs"));
const Roles = lazy(() => import("./pages/Roles"));
const Rooms = lazy(() => import("./pages/Rooms"));
const Reservations = lazy(() => import("./pages/Reservations"));
const Payments = lazy(() => import("./pages/Payments"));
const HotelReports = lazy(() => import("./pages/HotelReports"));
const SeasonalPrices = lazy(() => import("./pages/SeasonalPrices"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const DayPass = lazy(() => import("./pages/DayPass"));
const Catalogs = lazy(() => import("./pages/Catalogs"));

//rutas publicas: LandigPage
const Landing = lazy(() => import("./pages/public/Landing"));
const SearchRooms = lazy(() => import("./pages/public/SearchRooms"));
const RoomDetail = lazy(() => import("./pages/public/RoomDetail"));
const ClientLogin = lazy(() => import("./pages/public/ClientLogin"));
const ClientRegister = lazy(() => import("./pages/public/ClientRegister"));
const ClientReservations = lazy(() => import("./pages/public/ClientReservations"));
const ChangePassword = lazy(() => import("./pages/public/ChangePassword"));


function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton expand={false} />
        <SolidRouter>
          <Route path="/login" component={Login} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/users" component={Users} />
          <Route path="/logs" component={Logs} />
          <Route path="/roles" component={Roles} />
          <Route path="/rooms" component={Rooms} />
          <Route path="/reservations" component={Reservations} />
          <Route path="/payments" component={Payments} />
          <Route path="/hotel-reports" component={HotelReports} />
          <Route path="/seasonal-prices" component={SeasonalPrices} />
          <Route path="/maintenance" component={Maintenance} />
          <Route path="/daypass" component={DayPass} />
          <Route path="/catalogs" component={Catalogs} />
          {/* Rutas públicas */}
          <Route path="/" component={Landing} />
          <Route path="/search" component={SearchRooms} />
          <Route path="/room/:id" component={RoomDetail} />
          <Route path="/client-login" component={ClientLogin} />
          <Route path="/client-register" component={ClientRegister} />
          <Route path="/my-reservations" component={ClientReservations} />
          <Route path="/change-password" component={ChangePassword} />

          {/* <Route path="/" component={Login} /> */}
        </SolidRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
