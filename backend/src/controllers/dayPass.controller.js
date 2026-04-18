import { DayPass } from "../models/dayPass.model.js";

export class DayPassController {

    // Listar day passes con filtros y paginación
    async getAll(req, res) {
        try {
            const { status, paymentStatus, date, startDate, endDate, page = 1, limit = 10 } = req.query;
            const filter = {};

            if (status) filter.status = status;
            if (paymentStatus) filter.paymentStatus = paymentStatus;
            if (date) {
                const dayStart = new Date(date);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(date);
                dayEnd.setHours(23, 59, 59, 999);
                filter.date = { $gte: dayStart, $lte: dayEnd };
            }

            if (startDate || endDate) {
                if (!filter.date) filter.date = {};
                if (startDate) filter.date.$gte = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    filter.date.$lte = end;
                }
            }

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const [dayPasses, totalRecords] = await Promise.all([
                DayPass.find(filter)
                    .populate('createdBy', 'name email')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                DayPass.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(totalRecords / limitNum);

            res.status(200).json({
                msj: dayPasses.length === 0 ? "No se encontraron day passes" : "Day passes obtenidos correctamente",
                total: totalRecords,
                data: dayPasses,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalRecords,
                    limit: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener day passes", error: error.message });
        }
    }

    // Obtener day pass por ID
    async getDayPass(req, res) {
        try {
            const { id } = req.params;

            const dayPass = await DayPass.findById(id)
                .populate('createdBy', 'name email');

            if (!dayPass) {
                return res.status(404).json({ msj: "Day pass no encontrado" });
            }

            res.status(200).json({ msj: "Day pass encontrado", data: dayPass });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener day pass", error: error.message });
        }
    }

    // Obtener day passes del día actual
    async getToday(req, res) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);

            const dayPasses = await DayPass.find({
                date: { $gte: today, $lte: endOfToday },
                status: { $ne: 'cancelado' }
            })
                .populate('createdBy', 'name email')
                .sort({ createdAt: -1 });

            const totalGuests = dayPasses.reduce((sum, dp) => sum + dp.numberOfGuests, 0);
            const totalRevenue = dayPasses
                .filter(dp => dp.paymentStatus === 'pagado')
                .reduce((sum, dp) => sum + dp.totalAmount, 0);

            res.status(200).json({
                msj: "Day passes de hoy obtenidos",
                data: {
                    dayPasses,
                    summary: {
                        total: dayPasses.length,
                        totalGuests,
                        totalRevenue,
                        paid: dayPasses.filter(dp => dp.paymentStatus === 'pagado').length,
                        pending: dayPasses.filter(dp => dp.paymentStatus === 'pendiente').length
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al obtener day passes de hoy", error: error.message });
        }
    }

    // Crear day pass
    async createDayPass(req, res) {
        try {
            const { visitorName, visitorEmail, visitorPhone, date, numberOfGuests, services, pricePerPerson, paymentMethod, notes } = req.body;

            const code = DayPass.generateCode();
            const totalAmount = numberOfGuests * pricePerPerson;

            const newDayPass = await DayPass.create({
                code,
                visitorName,
                visitorEmail,
                visitorPhone,
                date: new Date(date),
                numberOfGuests,
                services: services || ['todas'],
                pricePerPerson,
                totalAmount,
                paymentMethod: paymentMethod || null,
                paymentStatus: paymentMethod ? 'pagado' : 'pendiente',
                checkInTime: new Date(),
                createdBy: req.user.id,
                notes
            });

            await newDayPass.populate('createdBy', 'name email');

            // Enviar email de confirmación si tiene email
            if (visitorEmail) {
                try {
                    const { sendDayPassConfirmation } = await import('../services/email.service.js');
                    sendDayPassConfirmation({
                        to: visitorEmail,
                        visitorName,
                        dayPass: newDayPass
                    });
                } catch (emailError) {
                    console.error('Error enviando email de day pass:', emailError.message);
                }
            }

            res.status(201).json({
                msj: "Day pass creado exitosamente",
                data: newDayPass
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al crear day pass", error: error.message });
        }
    }

    // Actualizar day pass
    async updateDayPass(req, res) {
        try {
            const { id } = req.params;

            const dayPass = await DayPass.findById(id);
            if (!dayPass) {
                return res.status(404).json({ msj: "Day pass no encontrado" });
            }

            if (dayPass.status === 'cancelado') {
                return res.status(400).json({ msj: "No se puede modificar un day pass cancelado" });
            }

            const updateData = { ...req.body };

            // Recalcular total si cambian personas o precio
            if (updateData.numberOfGuests || updateData.pricePerPerson) {
                const guests = updateData.numberOfGuests || dayPass.numberOfGuests;
                const price = updateData.pricePerPerson || dayPass.pricePerPerson;
                updateData.totalAmount = guests * price;
            }

            const updatedDayPass = await DayPass.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true
            }).populate('createdBy', 'name email');

            res.status(200).json({
                msj: "Day pass actualizado correctamente",
                data: updatedDayPass
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al actualizar day pass", error: error.message });
        }
    }

    // Registrar pago del day pass
    async registerPayment(req, res) {
        try {
            const { id } = req.params;
            const { paymentMethod } = req.body;

            const dayPass = await DayPass.findById(id);
            if (!dayPass) {
                return res.status(404).json({ msj: "Day pass no encontrado" });
            }

            if (dayPass.paymentStatus === 'pagado') {
                return res.status(400).json({ msj: "Este day pass ya fue pagado" });
            }

            if (dayPass.status === 'cancelado') {
                return res.status(400).json({ msj: "No se puede pagar un day pass cancelado" });
            }

            dayPass.paymentStatus = 'pagado';
            dayPass.paymentMethod = paymentMethod;
            await dayPass.save();

            res.status(200).json({
                msj: "Pago registrado exitosamente",
                data: dayPass
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al registrar pago", error: error.message });
        }
    }

    // Registrar check-out del visitante
    async checkOut(req, res) {
        try {
            const { id } = req.params;

            const dayPass = await DayPass.findById(id);
            if (!dayPass) {
                return res.status(404).json({ msj: "Day pass no encontrado" });
            }

            if (dayPass.status !== 'activo') {
                return res.status(400).json({ msj: `No se puede hacer check-out. Estado actual: ${dayPass.status}` });
            }

            dayPass.checkOutTime = new Date();
            dayPass.status = 'vencido';
            await dayPass.save();

            res.status(200).json({
                msj: "Check-out registrado exitosamente",
                data: dayPass
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al registrar check-out", error: error.message });
        }
    }

    // Cancelar day pass
    async cancelDayPass(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const dayPass = await DayPass.findById(id);
            if (!dayPass) {
                return res.status(404).json({ msj: "Day pass no encontrado" });
            }

            if (dayPass.status === 'cancelado') {
                return res.status(400).json({ msj: "Este day pass ya fue cancelado" });
            }

            dayPass.status = 'cancelado';
            dayPass.notes = reason ? `Cancelado: ${reason}` : dayPass.notes;

            if (dayPass.paymentStatus === 'pagado') {
                dayPass.paymentStatus = 'reembolsado';
            }

            await dayPass.save();

            res.status(200).json({
                msj: "Day pass cancelado correctamente",
                data: dayPass,
                refund: dayPass.paymentStatus === 'reembolsado'
                    ? `Reembolso de $${dayPass.totalAmount.toFixed(2)}`
                    : null
            });
        } catch (error) {
            res.status(500).json({ msj: "Error al cancelar day pass", error: error.message });
        }
    }
}