import express from 'express'
import { OAuth2Client } from 'google-auth-library'
import Token from '../models/Token.js'

const router = express.Router()

// TODO: use enviornment variables
const oAuth2Client = new OAuth2Client(
	process.env.GOOGLE_OAUTH_CLIENT_ID,
	process.env.GOOGLE_OAUTH_CLIENT_SECRET,
	'http://localhost:8080'
)

router.post('/authcode', async function(req, res) {
	const code = req.body.code

	try {
		const { tokens } = await oAuth2Client.getToken(code)

		const uid = req.uid

		let currentToken = await Token.updateOne({ uid }, tokens, {
			upsert: true,
		})

		res.send({
			success: true,
		})
	} catch (err) {
		console.log(err)
		res.send(
			JSON.stringify({
				error: true,
			})
		)
	}
})

export default router

function getIdTokenData(idToken) {
	let tokenData = JSON.parse(
		Buffer.from(idToken.split('.')[1], 'base64').toString()
	)
	return tokenData
}
