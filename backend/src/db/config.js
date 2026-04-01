import mongoose from 'mongoose'
import { url } from '../services/Enviroments.service.js'


export const mongoConnect = async () => {
    try {
        
        await mongoose.connect(url)

        console.log('connected to db')

    } catch (error) {
        
        console.error(error)
    }

}