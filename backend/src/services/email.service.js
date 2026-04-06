import nodemailer from 'nodemailer';
import { email_user, email_pass } from './Enviroments.service.js';

// Configurar transporter de Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: email_user,  //correo del hotel, actualmetne es un correo de prueba
        pass: email_pass,  
    }
});

// Verificar conexión al iniciar
transporter.verify()
    .then(() => console.log('✅ Servicio de email configurado correctamente'))
    .catch((err) => console.error('❌ Error configurando email:', err.message));

// Plantilla base HTML
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #1a1a2e; color: #ffffff; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0; opacity: 0.8; font-size: 14px; }
        .body { padding: 30px; color: #333; }
        .body h2 { color: #1a1a2e; margin-top: 0; }
        .info-box { background: #f8f9fa; border-left: 4px solid #4361ee; padding: 15px; margin: 15px 0; border-radius: 0 4px 4px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .info-label { color: #666; font-size: 14px; }
        .info-value { font-weight: 600; color: #333; font-size: 14px; }
        .total { background: #1a1a2e; color: #fff; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0; }
        .total span { font-size: 28px; font-weight: bold; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .badge-danger { background: #f8d7da; color: #721c24; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏨 Hotel Reservations</h1>
            <p>Sistema de Reservas</p>
        </div>
        <div class="body">
            ${content}
        </div>
        <div class="footer">
            <p>Este es un correo automático, por favor no responder.</p>
            <p>© ${new Date().getFullYear()} Hotel Reservations. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
`;

// Email de confirmación de pago
export const sendPaymentConfirmation = async ({ to, clientName, payment, reservation }) => {
    const methodLabels = {
        efectivo: 'Efectivo',
        tarjeta: 'Tarjeta de Crédito/Débito',
        transferencia: 'Transferencia Bancaria'
    };

    const content = `
        <h2>✅ Pago Confirmado</h2>
        <p>Hola <strong>${clientName}</strong>,</p>
        <p>Tu pago ha sido procesado exitosamente. A continuación los detalles:</p>
        
        <div class="info-box">
            <div class="info-row">
                <span class="info-label">Código de Reserva:</span>
                <span class="info-value">${reservation.reservationCode}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Transacción:</span>
                <span class="info-value">${payment.transactionId}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Comprobante:</span>
                <span class="info-value">${payment.receiptNumber}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Método de Pago:</span>
                <span class="info-value">${methodLabels[payment.paymentMethod] || payment.paymentMethod}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Habitación:</span>
                <span class="info-value">${reservation.room?.roomNumber || 'N/A'} - ${reservation.room?.type || ''}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Check-In:</span>
                <span class="info-value">${new Date(reservation.checkIn).toLocaleDateString('es-ES')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Check-Out:</span>
                <span class="info-value">${new Date(reservation.checkOut).toLocaleDateString('es-ES')}</span>
            </div>
        </div>
        
        <div class="total">
            <p style="margin:0; font-size: 14px; opacity: 0.8;">Monto Pagado</p>
            <span>$${payment.amount.toFixed(2)}</span>
        </div>
        
        <p style="color: #666; font-size: 14px;">Conserva este correo como comprobante de tu pago. Si tienes alguna duda, contacta a recepción.</p>
    `;

    await transporter.sendMail({
        from: `"Hotel Reservations" <${process.env.EMAIL_USER}>`,
        to,
        subject: `✅ Pago Confirmado - ${reservation.reservationCode}`,
        html: baseTemplate(content)
    });
};

// Email de confirmación de reserva
export const sendReservationConfirmation = async ({ to, clientName, reservation }) => {
    const content = `
        <h2>🎉 Reserva Confirmada</h2>
        <p>Hola <strong>${clientName}</strong>,</p>
        <p>Tu reserva ha sido confirmada exitosamente.</p>
        
        <div class="info-box">
            <div class="info-row">
                <span class="info-label">Código:</span>
                <span class="info-value">${reservation.reservationCode}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Habitación:</span>
                <span class="info-value">${reservation.room?.roomNumber || 'N/A'} - ${reservation.room?.type || ''}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Check-In:</span>
                <span class="info-value">${new Date(reservation.checkIn).toLocaleDateString('es-ES')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Check-Out:</span>
                <span class="info-value">${new Date(reservation.checkOut).toLocaleDateString('es-ES')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Huéspedes:</span>
                <span class="info-value">${reservation.numberOfGuests}</span>
            </div>
        </div>
        
        <div class="total">
            <p style="margin:0; font-size: 14px; opacity: 0.8;">Total a Pagar</p>
            <span>$${reservation.totalAmount.toFixed(2)}</span>
        </div>
        
        <p style="color: #666; font-size: 14px;">Recuerda que el check-in es a las 3:00 PM y el check-out a las 11:00 AM.</p>
    `;

    await transporter.sendMail({
        from: `"Hotel Reservations" <${process.env.EMAIL_USER}>`,
        to,
        subject: `🎉 Reserva Confirmada - ${reservation.reservationCode}`,
        html: baseTemplate(content)
    });
};

// Email de cancelación
export const sendCancellationEmail = async ({ to, clientName, reservation, cancellationFee }) => {
    const content = `
        <h2>❌ Reserva Cancelada</h2>
        <p>Hola <strong>${clientName}</strong>,</p>
        <p>Tu reserva ha sido cancelada. Aquí los detalles:</p>
        
        <div class="info-box">
            <div class="info-row">
                <span class="info-label">Código:</span>
                <span class="info-value">${reservation.reservationCode}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Habitación:</span>
                <span class="info-value">${reservation.room?.roomNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Motivo:</span>
                <span class="info-value">${reservation.cancellationReason || 'No especificado'}</span>
            </div>
            ${cancellationFee > 0 ? `
            <div class="info-row">
                <span class="info-label">Penalización:</span>
                <span class="info-value" style="color: #dc3545;">$${cancellationFee.toFixed(2)}</span>
            </div>
            ` : ''}
        </div>
        
        ${cancellationFee === 0
            ? '<p><span class="badge badge-success">Sin penalización aplicada</span></p>'
            : `<p><span class="badge badge-warning">Penalización: $${cancellationFee.toFixed(2)}</span></p>`
        }
        
        <p style="color: #666; font-size: 14px;">Si tienes preguntas sobre la cancelación o el reembolso, contacta a recepción.</p>
    `;

    await transporter.sendMail({
        from: `"Hotel Reservations" <${process.env.EMAIL_USER}>`,
        to,
        subject: `❌ Reserva Cancelada - ${reservation.reservationCode}`,
        html: baseTemplate(content)
    });
};

// Email de reembolso
export const sendRefundEmail = async ({ to, clientName, payment, reservation }) => {
    const content = `
        <h2>💰 Reembolso Procesado</h2>
        <p>Hola <strong>${clientName}</strong>,</p>
        <p>Se ha procesado un reembolso para tu reserva.</p>
        
        <div class="info-box">
            <div class="info-row">
                <span class="info-label">Código de Reserva:</span>
                <span class="info-value">${reservation.reservationCode}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Transacción Original:</span>
                <span class="info-value">${payment.transactionId}</span>
            </div>
        </div>
        
        <div class="total">
            <p style="margin:0; font-size: 14px; opacity: 0.8;">Monto Reembolsado</p>
            <span>$${payment.amount.toFixed(2)}</span>
        </div>
        
        <p style="color: #666; font-size: 14px;">El reembolso puede tardar entre 5-10 días hábiles en reflejarse según tu método de pago.</p>
    `;

    await transporter.sendMail({
        from: `"Hotel Reservations" <${process.env.EMAIL_USER}>`,
        to,
        subject: `💰 Reembolso Procesado - ${reservation.reservationCode}`,
        html: baseTemplate(content)
    });
};

export default transporter;
