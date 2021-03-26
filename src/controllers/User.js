import express from 'express'
import AuthMiddleware from '../middlewares/Auth.js'

import User from '../models/User.js'

import {
	doesRefferalExist,
	isValidRefferalId,
} from '../middlewares/Validations/User.js'

let router = express.Router()

router.get('/iscreator', AuthMiddleware, async function (req, res) {
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

router.post(
	'/refferal',
	AuthMiddleware,
	isValidRefferalId,
	doesRefferalExist,
	async function (req, res) {
		try {
			let user = req.user
			let successMessage

			if (!req.body.refferalId) {
				user.isReffered = false
				successMessage = 'no-referral'
			} else {
				user.isReffered = true
				user.refferedBy = req.body.refferalId
				successMessage = 'refferal-added'
			}

			await user.save()

			res.send({
				success: true,
				message: successMessage,
			})

			if (user.refferedBy) {
				addRefferalBonus(user.refferedBy)
			}

			return
		} catch (error) {
			console.log(error)

			return res.status(500).send({
				error: true,
				message: 'something-went-wrong',
			})
		}
	}
)

router.get('/money', AuthMiddleware, async function (req, res) {
	let user = await User.findOne({
		uid: req.uid,
	})
		.select('winnings bonus')
		.lean()
		.exec()

	if (!user) {
		return req.status(400).send({
			error: true,
			message: 'cannot-find-user',
		})
	}

	return res.send({
		winnings: user.winnings,
		bonus: user.bonus,
	})
})

router.get('/money/referral', AuthMiddleware, async function (req, res) {
	let referredUsers = await User.find({
		referredBy: req.uid,
	})
		.select('_id')
		.lean()
		.exec()

	let referralAmount = referredUsers.length * 50

	return res.send({
		referralAmount,
	})
})

router.get('/referrals', AuthMiddleware, async function (req, res) {
	try {
		let referrals = await User.find({
			refferedBy: req.uid,
		})
			.select('displayName picture')
			.lean()
			.exec()

		res.send(referrals)
	} catch (error) {
		res.status(500).send({
			error: true,
			message: 'something-went-wrong',
		})
	}
})

router.get('/transactions', AuthMiddleware, async function (req, res) {
	try {
		let transactions = await User.find({
			uid: req.uid,
		}).select('transactionsHistory')

		return res.send(transactions[0].transactionsHistory)
	} catch (error) {
		return res.status(500).send({
			error: true,
			message: 'something-went-wrong',
		})
	}
})

async function addRefferalBonus(refferedBy) {
	try {
		let user = await User.findOne({
			uid: refferedBy,
		}).exec()

		let referrlCount = (
			await User.find({
				refferedBy: refferedBy,
			})
				.lean()
				.exec()
		).length

		if (referrlCount % 3 == 0) {
			user.bonus += 50
			user.transactionsHistory.push({
				amount: 50,
				event: 'referral',
				time: new Date().getTime(),
			})
			await user.save()
		}
	} catch (error) {
		console.log('Adding Refferal Bonus Failed')
		console.log(error)
	}
}

export default router
