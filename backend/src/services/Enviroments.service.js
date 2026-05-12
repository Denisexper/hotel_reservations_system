import dotevn from 'dotenv'

//configuracion de dotenv
dotevn.config()

//validacion de envs
const Envs = [
    'PORT',
    'MONGOURL',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'EMAIL_USER',
    'EMAIL_PASS',
    'FRONTEND_URL'
]

//variables criticas que detienen el servidor si no estan definidas
const criticalEnvs = ['MONGOURL', 'JWT_SECRET', 'JWT_EXPIRES_IN']

Envs.forEach(env => {
    if(!process.env[env]){
        if(criticalEnvs.includes(env)){
            console.error(`❌ Variable crítica ${env} no está definida. Deteniendo servidor.`)
            process.exit(1)
        }
        console.warn(`⚠️ La variable de entorno ${env} no está definida`)
    }
})

//importacion de variables de entorno
export const port = process.env.PORT
export const url = process.env.MONGOURL
export const jwt_secret = process.env.JWT_SECRET
export const jwt_expires = process.env.JWT_EXPIRES_IN
export const email_user = process.env.EMAIL_USER
export const email_pass = process.env.EMAIL_PASS
export const frontend_url = process.env.FRONTEND_URL || 'http://localhost:3001'