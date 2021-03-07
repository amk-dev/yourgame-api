import Token from './../models/Token.js'

export default async function YoutubeCredentials(req, res, next) {
	const userToken = await Token.findOne({ uid: req.uid })
		.lean()
		.exec()
		
	if (userToken) {
		let {
			refresh_token,
			expiry_date,
			access_token,
			token_type,
			id_token,
			scope,
		} = userToken

		req.youtube_credentials = {
			refresh_token,
			expiry_date,
			access_token,
			token_type,
			id_token,
			scope,
		}

		next()
	} else {
		res.status(401).send({
			error: true,
			message: 'youtube-token-not-found',
		})
	}
}
