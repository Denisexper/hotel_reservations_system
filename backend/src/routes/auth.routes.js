import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();
const controller = new userController();

// rutas que no necesitan metadata

// rutas publicas
router.post('/login', controller.login);
router.post('/register', controller.register);

// logout solo necesita estar logeado 
router.post('/logout', authMiddleware, controller.logout);

// datos del usuario actual
router.get('/me', authMiddleware, controller.getMe);

export default router;