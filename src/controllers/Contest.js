import express from 'express'
import AuthMiddleware from './../middlewares/Auth.js'
import Contest from './../models/Contest'
import Contestant from './../models/Contestant'
import { isCreator } from '../middlewares/Validations/Contest.js'
import ContestActionsRouter from './ManageContest.js'

import { createNewContest } from './utils/utils.js'

let router = express.Router()

router.use('/:contestId', ContestActionsRouter)

router.post('/create', AuthMiddleware, isCreator, create)

router.get('/createdcontests', AuthMiddleware, sendCreatedContests)

router.get('/joinedcontests', AuthMiddleware, sendJoinedContests)

// TODO:: Add Pagination
router.get('/all', sendAllContests)

export default router

export async function create(req, res) {
	const { youtubeVideoId, contestTime } = req.body
	const host_uid = req.uid

	if (!youtubeVideoId) {
		return res.send({
			error: true,
			message: 'youtube-video-id-is-required',
		})
	}

	if (!contestTime) {
		return res.send({
			error: true,
			message: 'contest-time-is-required',
		})
	}

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
}

async function sendCreatedContests(req, res) {
	const uid = req.uid

	const contests = await Contest.find({
		host_uid: uid,
	})
		.sort({
			startTime: -1,
		})
		.lean()
		.exec()

	return res.send(contests)
}

export async function sendJoinedContests(req, res) {
	const uid = req.uid

	let contests = await Contestant.find({ uid: uid })
		.populate('contest', {
			host_display_name: 1,
			host_picture: 1,
			startTime: 1,
			status: 1,
		})
		.select({
			contest: 1,
			_id: 0,
		})
		.sort({
			startTime: -1,
		})
		.lean()
		.exec()

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
