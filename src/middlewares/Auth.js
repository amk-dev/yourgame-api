// import firebase admin instance
import admin from './../config/config.js'
import User from './../models/User.js'

import { findUserByUid } from './../controllers/utils/utils.js'

export default async function auth(req, res, next) {
	const bearer = req.headers.authorization

	let token = extractTokenFromHeader(bearer)
	if (!token) return res.status(401).end()

	let tokenContent = await getTokenContent(token)
	if (!tokenContent) return res.status(401).end()

	let { uid, email, picture } = tokenContent
	let user = await createUserIfDoesntExist(uid, email, picture)

	req.uid = uid
	req.email = email
	req.picture = picture
	req.displayName = user.displayName

	req.user = user

	next()
}

export async function attachUserDataIfAvailable(req, res, next) {
	const bearer = req.headers.authorization
	let token = extractTokenFromHeader(bearer)

	if (token) {
		let tokenContent = await getTokenContent(token)

		if (tokenContent) {
			let { uid, email, picture } = tokenContent
			let user = await createUserIfDoesntExist(uid, email, picture)

			req.uid = tokenContent.uid
			req.email = tokenContent.email
			req.picture = tokenContent.picture
			req.displayName = user.displayName
		}
	}

	next()
}

async function createUserIfDoesntExist(uid, email, picture) {
	let user = await findUserByUid(uid, false)

	if (!user) {
		let { displayName } = await admin.auth().getUser(uid)
		user = await createNewUser(uid, email, picture, displayName)
	}

	return user
}

function extractTokenFromHeader(bearer) {
	if (!bearer || !bearer.startsWith('Bearer ')) {
		return false
	}

	const token = bearer.split('Bearer ')[1].trim()

	return token
}

async function getTokenContent(token) {
	try {
		let tokenContent = await verifyIdToken(token)
		return tokenContent
	} catch (e) {
		return false
	}
}

async function verifyIdToken(idToken) {
	try {
		let decodedToken = await admin.auth().verifyIdToken(idToken)
		return decodedToken
	} catch (error) {
		console.log(error)
		return false
	}
}

async function createNewUser(uid, email, picture, displayName) {
	let user = new User({
		uid,
		email,
		picture,
		displayName,
	})

	await user.save()
	return user
}
