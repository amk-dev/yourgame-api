import express from 'express'
import AuthMiddleware from './../middlewares/Auth.js'
import Contest from './../models/Contest'
import Contestant from './../models/Contestant'

import { isCreator } from '../middlewares/Validations/Contest.js'

import ContestActionsRouter from './ManageContest.js'

let router = express.Router()

router.use('/:contestId', ContestActionsRouter)

router.post('/create', AuthMiddleware, isCreator, async function (req, res) {
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
})

router.get('/createdcontests', AuthMiddleware, async function (req, res) {
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
})

router.get('/joinedcontests', AuthMiddleware, async function (req, res) {
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
})

// TODO:: Add Pagination
router.get('/all', async function (req, res) {
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
})

export default router

async function createNewContest(
	host_uid,
	host_picture,
	host_display_name,
	youtubeVideoId,
	startTime,
	status
) {
	let newContest = new Contest({
		host_uid,
		host_picture,
		host_display_name,
		youtubeVideoId,
		startTime,
		status,
	})

	try {
		await newContest.save()
		return newContest
	} catch (e) {
		console.log(e)
		return false
	}
}
