import express from 'express'
import User from '../models/User.js'

import {
	doesRefferalExist,
	isValidRefferalId,
} from '../middlewares/Validations/User.js'

import AuthMiddleware from '../middlewares/Auth.js'

import { addRefferalBonus } from './utils/utils.js'

let router = express.Router()

router.get('/iscreator', AuthMiddleware, sendIsCreator)

router.post(
	'/refferal',
	AuthMiddleware,
	isValidRefferalId,
	doesRefferalExist,
	createNewReferral
)

router.get('/money', AuthMiddleware, sendMoneyDetails)

router.get('/money/referral', AuthMiddleware, sendReferralMoneyDetails)

router.get('/referrals', AuthMiddleware, sendReferrals)

router.get('/transactions', AuthMiddleware, sendTransactions)

export async function sendIsCreator(req, res) {
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
}

export async function createNewReferral(req, res) {
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

export async function sendMoneyDetails(req, res) {
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
}

export async function sendReferralMoneyDetails(req, res) {
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
}

export async function sendReferrals(req, res) {
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
}

export async function sendTransactions(req, res) {
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
}

export default router
