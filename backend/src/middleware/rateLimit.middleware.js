import rateLimit from 'express-rate-limit';

// Límite general para toda la API: 100 requests por minuto por IP
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { msj: "Demasiadas peticiones, intenta de nuevo en un minuto" }
});

// Límite estricto para login: 10 intentos por minuto por IP
export const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { msj: "Demasiados intentos de inicio de sesión, intenta de nuevo en un minuto" }
});
