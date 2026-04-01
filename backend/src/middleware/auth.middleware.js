import { verifyToken } from "../services/jwt.service.js";
import { Role } from "../models/role.model.js";

export const authMiddleware = async (req, res, next) => {
    try {
        //obtenemos el token del header de la peticion
        const authHeader = req.headers.authorization;

        //validamos si el token se envio en la peticion
        if(!authHeader){
            return res.status(401).json({
                msj: 'token no proporcionado'
            })
        }

        //separamos el token
        const token = authHeader.split(' ')[1]

        //verificamos si esta el token
        const decode = verifyToken(token)

        if(!decode){
            return res.status(401).json({
                msj: 'token invalido o expirado'
            })
        }

        // Cargar el rol y sus permisos
        const userRole = await Role.findById(decode.roleId);
        
        if (!userRole) {
            return res.status(403).json({
                msj: 'Rol no encontrado'
            });
        }

        // Agregar toda la información al request
        req.user = {
            id: decode.id,
            email: decode.email,
            roleId: decode.roleId,
            role: userRole.name, // Nombre del rol (admin, user, etc.)
            permissions: userRole.permissions // Array de permisos
        };

        next()
    } catch (error) {
        res.status(500).json({
            msj: 'error del servidor',
            error: error.message
        })
    }
}