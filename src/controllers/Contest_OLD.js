import express from 'express'
import AuthMiddleware from './../middlewares/Auth.js'
import YoutubeCredentials from './../middlewares/YoutubeCredentials.js'

import {
	getLiveChatIdAndStartTime,
	getChannelId,
} from './../services/YoutubeAPI.js'

import Contest from './../models/Contest'
import Contestant from './../models/Contestant'
import Point from './../models/Points'

import ContestActionsRouter from './ManageContest.js'

let router = express.Router()

router.use('/:contestId', ContestActionsRouter)

router.post('/create', AuthMiddleware, YoutubeCredentials, async function(
	req,
	res
) {
	const { name, broadCastId } = req.body
	const host_uid = req.uid

	let { liveChatId, startTime } = await getLiveChatIdAndStartTime(
		broadCastId,
		req.youtube_credentials
	)

	if (!liveChatId) {
		return res.status(500).send({
			error: true,
			message: 'cannot-create-contest',
		})
	}

	startTime = new Date(startTime).getTime()
	let newContest = await createNewContest(
		name,
		broadCastId,
		host_uid,
		liveChatId,
		startTime,
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

router.post('/join', AuthMiddleware, YoutubeCredentials, async function(
	req,
	res
) {
	let { channelId } = await getChannelId(req.youtube_credentials)
	let contestId = req.body.contestId

	if (!channelId) {
		return res.status(403).send({
			error: true,
			message: 'no-youtube-channel-found',
		})
	}

	// TODO: Consider Using Mongoose Middlewares For Validation

	// make sure that contest exists
	const contest = await doesContestExists(contestId)

	if (!contest) {
		return res.status(400).send({
			error: true,
			message: 'contest-does-not-exists',
		})
	}

	// make sure that contest status is upcoming
	if (contest.status != 'upcoming') {
		return res.status(400).send({
			error: true,
			message: 'contest-entry-time-over',
		})
	}

	// make sure that the contestant is not the creator of the contest
	if (contest.host_uid == req.uid) {
		console.log('This Is Getting Executed 3')

		return res.status(400).send({
			error: true,
			message: 'host-cannot-join-the-contest',
		})
	}

	let newContestant = new Contestant({
		uid: req.uid,
		channelId,
		contestId: contestId,
		points: 0,
	})

	await newContestant.save()

	return res.send({
		success: true,
	})
})

router.get('/mycontests', AuthMiddleware, async function(req, res) {
	const uid = req.uid

	const contests = await Contest.find({
		host_uid: uid,
	})
		.lean()
		.exec()

	return res.send(contests)
})

router.get('/joinedcontests', AuthMiddleware, async function(req, res) {
	const uid = req.uid

	let contestIds = await Contestant.find({ uid: uid })
		.select('contestId')
		.lean()
		.exec()
	return res.send(contestIds)
})

// TODO:: Add Pagination
router.get('/all', async function(req, res) {
	const contests = await Contest.find({})
		.lean()
		.exec()

	return res.send(contests)
})

export default router

async function createNewContest(
	name,
	broadCastId,
	host_uid,
	liveChatId,
	startTime,
	status
) {
	let newContest = new Contest({
		name,
		broadCastId,
		host_uid,
		liveChatId,
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

async function doesContestExists(contestId) {
	try {
		const contest = await Contest.findOne({ _id: contestId }).select({
			status: 1,
			host_uid: 1,
		})
		return contest
	} catch (e) {
		console.log(e)
		return false
	}
}
