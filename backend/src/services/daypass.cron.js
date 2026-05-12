import cron from 'node-cron';
import { DayPass } from '../models/dayPass.model.js';

// Ejecutar todos los días a las 11:59 PM
export const startDayPassCron = () => {
    cron.schedule('59 23 * * *', async () => {
        console.log('🎫 Ejecutando cron de vencimiento de day passes...');

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const result = await DayPass.updateMany(
                {
                    status: 'activo',
                    date: { $lt: today }
                },
                { status: 'vencido' }
            );

            console.log(`✅ Cron de day passes completado: ${result.modifiedCount} vencido(s)`);
        } catch (error) {
            console.error('❌ Error en cron de day passes:', error);
        }
    });

    console.log('🎫 Cron de day passes programado (todos los días a las 11:59 PM)');
};
