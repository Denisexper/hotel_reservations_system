import { Reservation } from '../models/reservation.model.js';

// Definición de niveles de fidelidad
export const LOYALTY_LEVELS = {
    BRONCE: { name: 'Bronce', minReservations: 0, maxReservations: 2, discount: 0, color: '#cd7f32' },
    PLATA: { name: 'Plata', minReservations: 3, maxReservations: 5, discount: 5, color: '#c0c0c0' },
    ORO: { name: 'Oro', minReservations: 6, maxReservations: 10, discount: 10, color: '#ffd700' },
    PLATINO: { name: 'Platino', minReservations: 11, maxReservations: Infinity, discount: 15, color: '#e5e4e2' }
};

// Calcular nivel de fidelidad de un cliente
export const calculateLoyaltyLevel = async (clientId) => {
    // Contar reservas completadas (check-out) o confirmadas/pagadas
    const reservationCount = await Reservation.countDocuments({
        client: clientId,
        status: { $in: ['confirmada', 'check-in', 'check-out'] },
        paymentStatus: 'pagado'
    });

    let level;
    if (reservationCount >= LOYALTY_LEVELS.PLATINO.minReservations) {
        level = LOYALTY_LEVELS.PLATINO;
    } else if (reservationCount >= LOYALTY_LEVELS.ORO.minReservations) {
        level = LOYALTY_LEVELS.ORO;
    } else if (reservationCount >= LOYALTY_LEVELS.PLATA.minReservations) {
        level = LOYALTY_LEVELS.PLATA;
    } else {
        level = LOYALTY_LEVELS.BRONCE;
    }

    // Calcular reservas para el siguiente nivel
    let nextLevel = null;
    let reservationsToNextLevel = 0;

    if (level.name === 'Bronce') {
        nextLevel = LOYALTY_LEVELS.PLATA;
        reservationsToNextLevel = LOYALTY_LEVELS.PLATA.minReservations - reservationCount;
    } else if (level.name === 'Plata') {
        nextLevel = LOYALTY_LEVELS.ORO;
        reservationsToNextLevel = LOYALTY_LEVELS.ORO.minReservations - reservationCount;
    } else if (level.name === 'Oro') {
        nextLevel = LOYALTY_LEVELS.PLATINO;
        reservationsToNextLevel = LOYALTY_LEVELS.PLATINO.minReservations - reservationCount;
    }

    return {
        level: level.name,
        color: level.color,
        discount: level.discount,
        reservationCount,
        nextLevel: nextLevel?.name || null,
        reservationsToNextLevel: reservationsToNextLevel > 0 ? reservationsToNextLevel : 0,
        nextLevelDiscount: nextLevel?.discount || null
    };
};

// Aplicar descuento por fidelidad al precio
export const applyLoyaltyDiscount = async (clientId, basePrice) => {
    const loyalty = await calculateLoyaltyLevel(clientId);

    if (loyalty.discount === 0) {
        return { finalPrice: basePrice, discount: 0, loyaltyLevel: loyalty.level };
    }

    const discountAmount = basePrice * (loyalty.discount / 100);
    const finalPrice = basePrice - discountAmount;

    return {
        finalPrice: Math.round(finalPrice * 100) / 100,
        discount: loyalty.discount,
        discountAmount: Math.round(discountAmount * 100) / 100,
        loyaltyLevel: loyalty.level
    };
};