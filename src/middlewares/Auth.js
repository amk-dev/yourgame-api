// import firebase admin instance
import admin from './../config/config.js'
import User from './../models/User.js'

export default async function auth(req, res, next) {
	const bearer = req.headers.authorization

	let token = extractTokenFromHeader(bearer)
	if (!token) return res.status(401).end()

	let tokenContent = await getTokenContent(token)
	if (!tokenContent) return res.status(401).end()

	let { uid, email, picture } = tokenContent
	let user = await findUserByUid(uid)

	if (!user) {
		let { displayName } = await admin.auth().getUser(uid)
		user = await createNewUser(uid, email, picture, displayName)
	}

	req.uid = uid
	req.email = email
	req.picture = picture
	req.displayName = user.displayName

	next()
}

export async function attachUserDataIfAvailable(req, res, next) {
	const bearer = req.headers.authorization
	let token = extractTokenFromHeader(bearer)

	if (token) {
		let tokenContent = await getTokenContent(token)

		if (tokenContent) {
			let user = await User.findOne({
				uid: tokenContent.uid,
			})
				.lean()
				.exec()

			if (!user) {
				let { uid, email, picture } = tokenContent

				let { displayName } = await admin.auth().getUser(uid)

				user = new User({
					uid,
					email,
					picture,
					displayName,
				})

				req.displayName = displayName

				try {
					await user.save()
				} catch (e) {
					console.log(e)
				}
			}

			req.uid = tokenContent.uid
			req.email = tokenContent.email
			req.picture = tokenContent.picture
			if (!req.displayName) {
				req.displayName = user.displayName
			}
		}
	}

	next()
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

async function findUserByUid(uid) {
	let user = await User.findOne({
		uid: uid,
	})
		.lean()
		.exec()

	return user
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
