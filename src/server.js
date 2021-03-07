import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import { connect } from './db.js'
import Auth from './controllers/Auth.js'
import Contest from './controllers/Contest.js'
import AuthMiddleware from './middlewares/Auth.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('combined'))

app.use('/auth', AuthMiddleware, Auth)
app.use('/contest', Contest)

export async function start() {
	await connect()
	app.listen(3000, function logConnection() {
		console.log('YourGame API is Running On http://localhost:3000/')
	})
}
