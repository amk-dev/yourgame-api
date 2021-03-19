import express from 'express'
import AuthMiddleware from '../middlewares/Auth.js'

import User from '../models/User.js'

let router = express.Router()

router.get('/iscreator', AuthMiddleware, async function(req, res) {
	const uid = req.uid

	let user = await User.findOne({
		uid,
	})
		.select('isCreator')
		.lean()
		.exec()

	return res.send({
		isCreator: user.isCreator,
	})
})

export default router
