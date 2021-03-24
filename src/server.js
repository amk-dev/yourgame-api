import express from 'express'
import cors from 'cors'

import * as Sentry from '@sentry/node'

import { connect } from './db.js'
import logger from './logger.js'
import morganHandler from './morgan.js'

import Contest from './controllers/Contest.js'
import User from './controllers/User.js'

if (process.env.NODE_ENV == 'production') {
	Sentry.init({
		dsn: process.env.SENTRY_URL,
	})
}

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(morganHandler)

app.use('/contest', Contest)
app.use('/user', User)

// eslint-disable-next-line
app.use(function (err, req, res, next) {
	logger.error(err)
	Sentry.captureException(err)
	return res.status(500).send({
		error: true,
		message: 'something-went-wrong',
	})
})

export async function start() {
	await connect()
	app.listen(process.env.PORT, function logConnection() {
		console.log(`YourGame API is running on port ${process.env.PORT}`)
		console.log(`Enviornment ${process.env.NODE_ENV}`)
	})
}
