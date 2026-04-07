import { Schema, model } from "mongoose";

const seasonalPriceSchema = new Schema({
    // Nombre de la temporada
    seasonName: {
        type: String,
        required: [true, 'El nombre de la temporada es obligatorio'],
        trim: true
    },

    // Fechas de la temporada
    startDate: {
        type: Date,
        required: [true, 'La fecha de inicio es obligatoria']
    },
    endDate: {
        type: Date,
        required: [true, 'La fecha de fin es obligatoria'],
        validate: {
            validator: function (value) {
                return value > this.startDate;
            },
            message: 'La fecha de fin debe ser posterior a la fecha de inicio'
        }
    },

    // Tipo de modificador: 'porcentaje' o 'fijo'
    modifierType: {
        type: String,
        required: true,
        enum: {
            values: ['porcentaje', 'fijo'],
            message: '{VALUE} no es un tipo de modificador válido'
        },
        default: 'porcentaje'
    },

    // Valor del modificador (ej: 30 para +30%, o 25 para +$25)
    modifierValue: {
        type: Number,
        required: [true, 'El valor del modificador es obligatorio']
    },

    // Aplicar a tipo específico de habitación o a todas
    roomType: {
        type: String,
        enum: ['Simple', 'Doble', 'Suite', 'Deluxe', 'Presidencial', 'todas'],
        default: 'todas'
    },

    isActive: {
        type: Boolean,
        default: true
    },

    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'userModel',
        required: true
    }
}, {
    timestamps: true
});

// Índices
seasonalPriceSchema.index({ startDate: 1, endDate: 1 });
seasonalPriceSchema.index({ isActive: 1 });

// Método estático: obtener precio ajustado por temporada
seasonalPriceSchema.statics.getAdjustedPrice = async function (basePrice, roomType, checkInDate) {
    const season = await this.findOne({
        isActive: true,
        startDate: { $lte: checkInDate },
        endDate: { $gte: checkInDate },
        $or: [
            { roomType: 'todas' },
            { roomType: roomType }
        ]
    }).sort({ roomType: -1 }); // Prioriza la temporada específica por tipo

    if (!season) return { price: basePrice, season: null };

    let adjustedPrice;
    if (season.modifierType === 'porcentaje') {
        adjustedPrice = basePrice + (basePrice * season.modifierValue / 100);
    } else {
        adjustedPrice = basePrice + season.modifierValue;
    }

    return {
        price: Math.round(adjustedPrice * 100) / 100,
        season: {
            name: season.seasonName,
            modifierType: season.modifierType,
            modifierValue: season.modifierValue
        }
    };
};

export const SeasonalPrice = model('SeasonalPrice', seasonalPriceSchema);