import { Reservation } from "../models/reservation.model.js";
import { Room } from "../models/room.model.js";
import { Payment } from "../models/payment.model.js";
import dayjs from "dayjs";

export class DashboardController {

    // Estadísticas generales del hotel
    async getGeneralStats(req, res) {
        try {
            const today = dayjs().startOf('day').toDate();
            const endOfToday = dayjs().endOf('day').toDate();
            const startOfMonth = dayjs().startOf('month').toDate();
            const endOfMonth = dayjs().endOf('month').toDate();

            // Consultas en paralelo
            const [
                totalRooms,
                occupiedRooms,
                maintenanceRooms,
                totalReservations,
                activeReservations,
                monthlyReservations,
                todayCheckIns,
                todayCheckOuts,
                monthlyRevenue,
                totalRevenue,
                pendingPayments
            ] = await Promise.all([
                // Habitaciones
                Room.countDocuments({ isActive: true }),
                Room.countDocuments({ isActive: true, status: 'ocupada' }),
                Room.countDocuments({ isActive: true, status: 'mantenimiento' }),

                // Reservas
                Reservation.countDocuments(),
                Reservation.countDocuments({ status: { $in: ['pendiente', 'confirmada', 'check-in'] } }),
                Reservation.countDocuments({
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                }),

                // Check-ins/Check-outs del día
                Reservation.countDocuments({
                    status: { $in: ['confirmada', 'check-in'] },
                    checkIn: { $gte: today, $lte: endOfToday }
                }),
                Reservation.countDocuments({
                    status: 'check-in',
                    checkOut: { $gte: today, $lte: endOfToday }
                }),

                // Ingresos del mes
                Payment.aggregate([
                    {
                        $match: {
                            status: 'completado',
                            paymentDate: { $gte: startOfMonth, $lte: endOfMonth }
                        }
                    },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]),

                // Ingresos totales
                Payment.aggregate([
                    { $match: { status: 'completado' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]),

                // Pagos pendientes
                Reservation.countDocuments({ paymentStatus: 'pendiente', status: { $ne: 'cancelada' } })
            ]);

            const availableRooms = totalRooms - occupiedRooms - maintenanceRooms;
            const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

            res.status(200).json({
                msj: "Estadísticas generales obtenidas",
                data: {
                    rooms: {
                        total: totalRooms,
                        occupied: occupiedRooms,
                        available: availableRooms,
                        maintenance: maintenanceRooms,
                        occupancyRate
                    },
                    reservations: {
                        total: totalReservations,
                        active: activeReservations,
                        thisMonth: monthlyReservations,
                        pendingPayments
                    },
                    today: {
                        checkIns: todayCheckIns,
                        checkOuts: todayCheckOuts
                    },
                    revenue: {
                        thisMonth: monthlyRevenue[0]?.total || 0,
                        total: totalRevenue[0]?.total || 0
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener estadísticas", error: error.message });
        }
    }

    // Ingresos por período (para gráficos)
    async getRevenueByPeriod(req, res) {
        try {
            const { period = 'monthly', year = new Date().getFullYear() } = req.query;

            let groupFormat;
            if (period === 'daily') {
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } };
            } else if (period === 'weekly') {
                groupFormat = { $isoWeek: '$paymentDate' };
            } else {
                groupFormat = { $month: '$paymentDate' };
            }

            const startOfYear = new Date(`${year}-01-01`);
            const endOfYear = new Date(`${year}-12-31T23:59:59`);

            const revenue = await Payment.aggregate([
                {
                    $match: {
                        status: 'completado',
                        paymentDate: { $gte: startOfYear, $lte: endOfYear }
                    }
                },
                {
                    $group: {
                        _id: groupFormat,
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            // Si es mensual, mapear nombres de meses
            let formattedRevenue = revenue;
            if (period === 'monthly') {
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                formattedRevenue = revenue.map(item => ({
                    month: monthNames[item._id - 1],
                    monthNumber: item._id,
                    total: item.total,
                    count: item.count
                }));
            }

            res.status(200).json({
                msj: "Ingresos por período obtenidos",
                data: formattedRevenue,
                year: parseInt(year),
                period
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener ingresos", error: error.message });
        }
    }

    // Reservas por estado (para gráfico de pastel)
    async getReservationsByStatus(req, res) {
        try {
            const stats = await Reservation.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            const statusLabels = {
                'pendiente': 'Pendiente',
                'confirmada': 'Confirmada',
                'check-in': 'Check-In',
                'check-out': 'Check-Out',
                'cancelada': 'Cancelada'
            };

            const formatted = stats.map(item => ({
                status: item._id,
                label: statusLabels[item._id] || item._id,
                count: item.count
            }));

            res.status(200).json({
                msj: "Reservas por estado obtenidas",
                data: formatted
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener reservas por estado", error: error.message });
        }
    }

    // Habitaciones más reservadas (ranking)
    async getTopRooms(req, res) {
        try {
            const { limit = 5 } = req.query;

            const topRooms = await Reservation.aggregate([
                {
                    $match: {
                        status: { $ne: 'cancelada' }
                    }
                },
                {
                    $group: {
                        _id: '$room',
                        totalReservations: { $sum: 1 },
                        totalRevenue: { $sum: '$totalAmount' }
                    }
                },
                { $sort: { totalReservations: -1 } },
                { $limit: parseInt(limit) },
                {
                    $lookup: {
                        from: 'rooms',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'roomInfo'
                    }
                },
                { $unwind: '$roomInfo' },
                {
                    $project: {
                        _id: 0,
                        roomId: '$_id',
                        roomNumber: '$roomInfo.roomNumber',
                        type: '$roomInfo.type',
                        totalReservations: 1,
                        totalRevenue: 1
                    }
                }
            ]);

            res.status(200).json({
                msj: "Habitaciones más reservadas",
                data: topRooms
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener ranking", error: error.message });
        }
    }

    // Check-ins y check-outs del día (para recepcionista)
    async getTodayActivity(req, res) {
        try {
            const today = dayjs().startOf('day').toDate();
            const endOfToday = dayjs().endOf('day').toDate();

            const [checkIns, checkOuts] = await Promise.all([
                Reservation.find({
                    status: { $in: ['confirmada', 'check-in'] },
                    checkIn: { $gte: today, $lte: endOfToday }
                })
                    .populate('client', 'name email phone')
                    .populate('room', 'roomNumber type floor')
                    .sort({ checkIn: 1 }),

                Reservation.find({
                    status: 'check-in',
                    checkOut: { $gte: today, $lte: endOfToday }
                })
                    .populate('client', 'name email phone')
                    .populate('room', 'roomNumber type floor')
                    .sort({ checkOut: 1 })
            ]);

            res.status(200).json({
                msj: "Actividad del día obtenida",
                data: {
                    checkIns: {
                        count: checkIns.length,
                        reservations: checkIns
                    },
                    checkOuts: {
                        count: checkOuts.length,
                        reservations: checkOuts
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener actividad del día", error: error.message });
        }
    }

    // Ocupación por período (para gráfico de líneas)
    async getOccupancyByPeriod(req, res) {
        try {
            const { days = 30 } = req.query;
            const totalRooms = await Room.countDocuments({ isActive: true });

            const startDate = dayjs().subtract(parseInt(days), 'day').startOf('day').toDate();
            const endDate = dayjs().endOf('day').toDate();

            // Obtener reservas activas en el período
            const reservations = await Reservation.find({
                status: { $in: ['confirmada', 'check-in', 'check-out'] },
                checkIn: { $lte: endDate },
                checkOut: { $gte: startDate }
            }).select('checkIn checkOut');

            // Calcular ocupación por día
            const occupancyData = [];
            let currentDate = dayjs(startDate);
            const end = dayjs(endDate);

            while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
                const date = currentDate.toDate();
                const occupiedCount = reservations.filter(r => {
                    return new Date(r.checkIn) <= date && new Date(r.checkOut) > date;
                }).length;

                occupancyData.push({
                    date: currentDate.format('YYYY-MM-DD'),
                    occupied: occupiedCount,
                    available: totalRooms - occupiedCount,
                    rate: totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0
                });

                currentDate = currentDate.add(1, 'day');
            }

            res.status(200).json({
                msj: "Ocupación por período obtenida",
                data: occupancyData,
                totalRooms
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener ocupación", error: error.message });
        }
    }

    // Ingresos por método de pago (para gráfico de pastel)
    async getRevenueByPaymentMethod(req, res) {
        try {
            const stats = await Payment.aggregate([
                { $match: { status: 'completado' } },
                {
                    $group: {
                        _id: '$paymentMethod',
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { total: -1 } }
            ]);

            const methodLabels = {
                'efectivo': 'Efectivo',
                'tarjeta': 'Tarjeta',
                'transferencia': 'Transferencia'
            };

            const formatted = stats.map(item => ({
                method: item._id,
                label: methodLabels[item._id] || item._id,
                total: item.total,
                count: item.count
            }));

            res.status(200).json({
                msj: "Ingresos por método de pago",
                data: formatted
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener ingresos por método", error: error.message });
        }
    }
}