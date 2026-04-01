import dotevn from 'dotenv'

//configuracion de dotenv
dotevn.config()

//importacion de variables de entorno
export const port = process.env.PORT
export const url = process.env.MONGOURL
export const jwt_secret = process.env.JWT_SECRET
export const jwt_expires = process.env.JWT_EXPIRES_IN