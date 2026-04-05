import express from "express";
import { port } from "./services/Enviroments.service.js";
import { mongoConnect } from "./db/config.js";
import morgan from "morgan";
import cors from "cors";
import { errorHandler } from "./middleware/error.middleware.js";

// importamos las rutas nuevas con metadata
import authRoutes from "./routes/auth.routes.js";
import userRoutes, { userRoutes as userRoutesMetadata } from "./routes/users.routes.js";
import rolesRoutes, { roleRoutes as roleRoutesMetadata } from "./routes/roles.routes.js";
import logsRoutes, { logRoutes as logRoutesMetadata } from "./routes/logs.routes.js";
import roomsRoutes, { roomRoutes as roomsRoutesMetadata } from "./routes/rooms.routes.js";

// import de seeds
import { seedRoles } from "./db/seedRoles.js";
import { seedPermissions } from "./db/seedPermissions.js";

import path from 'path'
import { fileURLToPath } from "url";

// Configurar servidor
const server = express();

// para usar _dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración server con json
server.use(express.json());

// Configuración de cors
server.use(
  cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Configuramos morgan (ver las peticiones http en la terminal)
server.use(morgan("dev"));

// Levantar servidor
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

//servir los archivos estáticos de las imágenes de habitaciones
server.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configuración base de datos
mongoConnect().then(async () => {
  console.log("MongoDB conectado");

  // Auto-descubrir y sincronizar permisos
  await seedPermissions([
    userRoutesMetadata,
    roleRoutesMetadata,
    logRoutesMetadata,
    roomsRoutesMetadata,
  ]);

  // Crear roles del sistema (solo si no existen)
  console.log("🌱 Creando roles del sistema...");
  await seedRoles();
});

// Inicializar rutas
// Rutas de autenticación (públicas)
server.use("/api", authRoutes);

// Rutas de recursos (protegidas)
server.use("/api", userRoutes);
server.use("/api/roles", rolesRoutes);
server.use("/api", logsRoutes);
server.use("/api/rooms", roomsRoutes);

// Middleware de manejo de errores (al final de todas las rutas)
server.use(errorHandler);