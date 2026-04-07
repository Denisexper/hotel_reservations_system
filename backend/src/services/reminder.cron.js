import cron from 'node-cron';
import { Reservation } from '../models/reservation.model.js';
import { sendCheckInReminder } from './email.service.js';

// Ejecutar todos los días a las 8:00 AM
export const startReminderCron = () => {
    cron.schedule('0 8 * * *', async () => {
        console.log('⏰ Ejecutando cron de recordatorios...');

        try {
            const now = new Date();

            // Buscar reservas con check-in en 1 día o 3 días
            const reminderDays = [1, 3];

            for (const days of reminderDays) {
                const targetDate = new Date(now);
                targetDate.setDate(targetDate.getDate() + days);

                // Rango del día completo
                const startOfDay = new Date(targetDate);
                startOfDay.setHours(0, 0, 0, 0);

                const endOfDay = new Date(targetDate);
                endOfDay.setHours(23, 59, 59, 999);

                const reservations = await Reservation.find({
                    status: { $in: ['pendiente', 'confirmada'] },
                    checkIn: { $gte: startOfDay, $lte: endOfDay }
                })
                    .populate('client', 'name email')
                    .populate('room', 'roomNumber type');

                console.log(`📧 ${reservations.length} recordatorios para check-in en ${days} día(s)`);

                for (const reservation of reservations) {
                    try {
                        await sendCheckInReminder({
                            to: reservation.client.email,
                            clientName: reservation.client.name,
                            reservation
                        });
                        console.log(`✅ Recordatorio enviado a ${reservation.client.email} - ${reservation.reservationCode}`);
                    } catch (emailError) {
                        console.error(`❌ Error enviando recordatorio a ${reservation.client.email}:`, emailError.message);
                    }
                }
            }

            console.log('✅ Cron de recordatorios completado');
        } catch (error) {
            console.error('❌ Error en cron de recordatorios:', error);
        }
    });

    console.log('⏰ Cron de recordatorios programado (todos los días a las 8:00 AM)');
};