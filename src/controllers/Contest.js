import express from 'express'
import AuthMiddleware from './../middlewares/Auth.js'
import Contest from './../models/Contest'

import {
	isCreator,
	hasYoutubeIdInBody,
	hasContestTimeInBody,
} from '../middlewares/Validations/Contest.js'
import ContestActionsRouter from './ManageContest.js'

import {
	createNewContest,
	getContestsByHostUid,
	getJoinedContestsForUser,
} from './utils/utils.js'

let router = express.Router()

router.use('/:contestId', ContestActionsRouter)

router.post(
	'/create',
	AuthMiddleware,
	isCreator,
	hasYoutubeIdInBody,
	hasContestTimeInBody,
	create
)

router.get('/createdcontests', AuthMiddleware, sendCreatedContests)

router.get('/joinedcontests', AuthMiddleware, sendJoinedContests)

// TODO:: Add Pagination
router.get('/all', sendAllContests)

export default router

export async function create(req, res) {
	try {
		const { youtubeVideoId, contestTime } = req.body
		const host_uid = req.uid

		// TODO: check if the date is in the future
		let newContest = await createNewContest(
			host_uid,
			req.picture,
			req.displayName,
			youtubeVideoId,
			contestTime,
			'upcoming'
		)

		if (newContest) {
			return res.send({
				success: true,
				contestId: newContest._id,
			})
		} else {
			return res.status(500).send({
				error: true,
				message: 'could-not-create-contest',
			})
		}
	} catch (error) {
		return res.status(500).send({
			error: true,
			message: 'something-went-wrong',
		})
	}
}

async function sendCreatedContests(req, res) {
	try {
		const uid = req.uid
		const contests = await getContestsByHostUid(uid)
		return res.send(contests)
	} catch (error) {
		return res.status(500).send({
			error: true,
			message: 'something-went-wrong',
		})
	}
}

export async function sendJoinedContests(req, res) {
	const uid = req.uid

	let contests = await getJoinedContestsForUser(uid)

	let joinedcontests = []

	for (let contest of contests) {
		if (contest.contest) {
			joinedcontests.push(contest.contest)
		}
	}

	return res.send(joinedcontests)
}

export async function sendAllContests(req, res) {
	const contests = await Contest.find({
		status: 'upcoming',
	})
		.select({ questions: 0 })
		.sort({
			startTime: -1,
		})
		.lean()
		.exec()

	return res.send(contests)
}
