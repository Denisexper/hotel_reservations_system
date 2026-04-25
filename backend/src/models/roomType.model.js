import { Schema, model } from "mongoose";

const roomTypeSchema = new Schema({
    name: {
        type: String,
        required: [true, 'El nombre del tipo de habitación es obligatorio'],
        unique: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const RoomType = model('RoomType', roomTypeSchema);
