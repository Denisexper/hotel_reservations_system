/**
 * Cron de detección automática de no-shows.
 *
 * Se ejecuta todos los días a las 11:00 PM y busca reservas en estado
 * 'pendiente' o 'confirmada' cuya fecha de check-in ya pasó (el cliente
 * nunca se presentó). Por cada una: marca la reserva como 'no-show',
 * aplica penalización del 100%, libera la habitación y notifica al cliente
 * por email. El error de email está aislado para que no interrumpa el
 * procesamiento del resto de reservas.
 *
 * Complementa a reminder.cron.js (8:00 AM), que mira reservas futuras.
 * Ambos crons nunca tocan la misma reserva.
 */
import cron from 'node-cron';
import { Reservation } from '../models/reservation.model.js';
import { Room } from '../models/room.model.js';
import { sendNoShowEmail } from './email.service.js';

// Ejecutar todos los días a las 11:00 PM
export const startNoShowCron = () => {
    cron.schedule('0 23 * * *', async () => {
        console.log('🔍 Ejecutando cron de detección de no-shows...');

        try {
            const now = new Date();

            // Reservas cuyo check-in ya pasó y siguen activas sin que se haya registrado check-in
            const noShowReservations = await Reservation.find({
                status: { $in: ['pendiente', 'confirmada'] },
                checkIn: { $lt: now }
            })
                .populate('client', 'name email')
                .populate('room', 'roomNumber type');

            console.log(`🚫 ${noShowReservations.length} no-show(s) detectado(s)`);

            for (const reservation of noShowReservations) {
                try {
                    const cancellationFee = reservation.totalAmount; // Penalización del 100%

                    reservation.status = 'no-show';
                    reservation.cancelledAt = now;
                    reservation.cancellationReason = 'No-show: el cliente no se presentó al check-in';
                    reservation.cancellationFee = cancellationFee;
                    await reservation.save();

                    await Room.findByIdAndUpdate(reservation.room._id, { status: 'disponible' });

                    try {
                        await sendNoShowEmail({
                            to: reservation.client.email,
                            clientName: reservation.client.name,
                            reservation,
                            cancellationFee
                        });
                    } catch (emailError) {
                        console.error(`❌ Error enviando email de no-show a ${reservation.client.email}:`, emailError.message);
                    }

                    console.log(`✅ No-show procesado: ${reservation.reservationCode} - ${reservation.client.email}`);
                } catch (reservationError) {
                    console.error(`❌ Error procesando no-show ${reservation.reservationCode}:`, reservationError.message);
                }
            }

            console.log('✅ Cron de no-shows completado');
        } catch (error) {
            console.error('❌ Error en cron de no-shows:', error);
        }
    });

    console.log('🔍 Cron de no-shows programado (todos los días a las 11:00 PM)');
};
