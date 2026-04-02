export const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log para debugging
    console.error(`[Error Handler] ${err.name}: ${err.message}`);

    // 1. Error de Duplicidad (El P2002 de Mongoose)
    if (err.code === 11000) {
        return res.status(409).json({
            msj: 'Conflicto de datos: El valor ya existe en el sistema',
            field: Object.keys(err.keyValue) // Te dice qué campo falló (ej: email)
        });
    }

    // 2. Error de ID mal formado (CastError)
    if (err.name === 'CastError') {
        return res.status(400).json({
            msj: `Recurso no encontrado. El ID "${err.value}" no es válido.`
        });
    }

    // 3. Error de validación de Schema (ValidationError)
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({
            msj: 'Error de validación',
            errors: messages
        });
    }

    //errores de jwt (no pasan porque se detienen en el auth.middleware, pero por si acaso)
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            message: 'Token inválido'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            message: 'Token expirado'
        });
    }

    // 4. Error por defecto (500)
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        msj: error.message || 'Error Interno del Servidor',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};