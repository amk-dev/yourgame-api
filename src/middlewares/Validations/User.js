import User from '../../models/User.js'

export async function isValidRefferalId(req, res, next) {
	if (req.body.refferalId) {
		const user = await User.findOne({
			uid: req.body.refferalId,
		})
			.lean()
			.exec()

		if (!user) {
			return res.status(400).send({
				error: true,
				message: 'invalid-refferalId',
			})
		}
	}

	next()
}

export async function doesRefferalExist(req, res, next) {
	try {
		let user = req.user

		if (user.isReffered != undefined) {
			return res.status(400).send({
				error: true,
				message: 'referral-already-exist',
			})
		}

		next()
	} catch (error) {
		console.log(error)
		res.status(500).send({
			error: true,
			message: 'something-went-wrong',
		})
	}
}
