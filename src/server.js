import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import { connect } from './db.js'
import Auth from './controllers/Auth.js'
import Contest from './controllers/Contest.js'
import AuthMiddleware from './middlewares/Auth.js'
import User from './controllers/User.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

morgan.token('uid', (req) => (req.uid ? req.uid : 'not-authorized'))
app.use(
	morgan(
		':method :url :status :res[content-length] :response-time ms :date[clf] :uid'
	)
)

app.use('/auth', AuthMiddleware, Auth)
app.use('/contest', Contest)
app.use('/user', User)

app.use(function (err, req, res) {
	console.log(err)
	return res.status(500).send({
		error: true,
		message: 'something-went-wrong',
	})
})

export async function start() {
	await connect()
	app.listen(process.env.PORT, function logConnection() {
		console.log(`YourGame API is running on port ${process.env.PORT}`)
	})
}
