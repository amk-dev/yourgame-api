import express from 'express'
import AuthMiddleware from '../middlewares/Auth.js'
import YoutubeCredentials from '../middlewares/YoutubeCredentials.js'

import Contest from './../models/Contest'
import Contestant from './../models/Contestant'
import Question from './../models/Question'
import Submission from './../models/Submission'
import Point from './../models/Points'

import { findById } from './../utils/CRED.js'

import {
	getLiveComments,
	getStartingPageToken,
	pollComments,
} from './../services/YoutubeAPI.js'

let router = express.Router({
	mergeParams: true,
})

// Should Generate The Questions And Return The First Question
router.post('/start', AuthMiddleware, YoutubeCredentials, async function(
	req,
	res
) {
	// Check If The Current User Is The Creator
	let contestId = req.params.contestId

	if (!contestId) {
		return res.status(400).send({
			error: true,
			message: 'contest-id-required',
		})
	}

	let contest = await getContest(contestId, req.uid, false)

	if (!contest) {
		return res.status(400).send({
			error: true,
		})
	}

	// is it already started
	if (contest.status == 'live') {
		return res.status(400).send({
			error: true,
			message: 'contest-already-started',
		})
	}

	// pick random sample for questions
	let questions = await Question.aggregate([
		{
			$project: {
				correct_answer: 0,
			},
		},
	]).sample(4)

	let questionIds = questions.reduce(function getQuestionIds(
		questionIds,
		question
	) {
		questionIds.push(question._id)
		return questionIds
	},
	[])

	// get the next page token
	let nextPageToken = await getStartingPageToken(
		contest.liveChatId,
		req.youtube_credentials
	)

	contest.status = 'live'
	contest.questions = questionIds
	contest.nextPageToken = nextPageToken
	contest.currentQuestion = 1

	try {
		await contest.save()
		pollComments(
			contest.liveChatId,
			nextPageToken,
			req.youtube_credentials,
			contest._id
		)

		return res.send({
			question: questions[0],
		})
	} catch (e) {
		console.log(e)
		return res.send({
			error: true,
		})
	}
})

router.get('/nextquestion', AuthMiddleware, YoutubeCredentials, async function(
	req,
	res
) {
	let contestId = req.params.contestId

	if (!contestId) {
		return res.status(400).send({
			error: true,
			message: 'contest-id-required',
		})
	}

	let contest = await getContest(contestId, req.uid, false)

	if (!contest) {
		return res.status(400).send({
			error: true,
		})
	}

	if (contest.currentQuestion + 1 > 4) {
		return res.status(400).send({
			error: true,
			message: 'all-questions-finished',
		})
	}

	let nextQuestion = await Question.findById(
		contest.questions[contest.currentQuestion]
	)
		.select('name option_a option_b option_c option_d')
		.lean()
		.exec()

	contest.currentQuestion += 1

	try {
		await contest.save()

		return res.send({
			question: nextQuestion,
		})
	} catch (e) {
		console.log(e)
		return res.status(500).send({
			error: true,
		})
	}
})

router.post('/leaderboard', AuthMiddleware, YoutubeCredentials, async function(
	req,
	res
) {
	const contestId = req.params.contestId

	if (!contestId) {
		return res.status(400).send({
			error: true,
			message: 'contest-id-required',
		})
	}

	try {
		let leaderboard = await Point.find({
			contestId: contestId,
		})
			.sort({
				points: -1,
			})
			.limit(10)
			.lean()
			.exec()

		res.send(leaderboard)
	} catch (e) {
		res.status(500).send({
			error: true,
			message: 'cannot-get-leaderboard',
		})
	}
})

router.post('/answer', AuthMiddleware, async function(req, res) {
	const contestId = req.params.contestId

	// does the contestId is supplied
	if (!contestId) {
		return res.status(400).send({
			error: true,
			message: 'contest-id-required',
		})
	}

	// does the contestId exists
	let contest = await findById(Contest, contestId)
	const currentQuestionId = contest.questions[contest.currentQuestion - 1]

})

export async function processComments(comments, contestId) {
	let contest = await findById(Contest, contestId)
	const currentQuestionId = contest.questions[contest.currentQuestion - 1]

	for (let comment of comments) {
		// validate the comment format and get details
		const commentDetails = validateComment(comment.content)

		if (!commentDetails) {
			console.log(comment)
			console.log('Not A Valid Comment')
			continue
		}

		if (commentDetails.question != contest.currentQuestion) {
			console.log(comment)
			console.log('Valid Comment, But Not A Valid Question')
		}

		const contestant = await findContestantWithChannelId(
			comment.authorChannelId,
			contest._id
		)

		if (!contestant) {
			console.log(comment)
			console.log('Valid Comment, But Not Registered')
			continue
		}

		// check if the question is already answered
		let submission = await isAlreadySubmitted(
			currentQuestionId,
			contestant.uid
		)

		if (submission) {
			console.log(comment)
			console.log('You Have Already Submitted The Answer')
			continue
		}

		const currentQuestion = await getCurrentQuestion(currentQuestionId)

		console.log('Creating New Submission')
		console.log(commentDetails.answer, currentQuestion.correct_answer)

		const newSubmission = await createNewSubmission(
			contestant.uid,
			contest._id,
			commentDetails.answer,
			currentQuestion.correct_answer,
			currentQuestionId,
			0
		)

		try {
			if (newSubmission.isRight) {
				contestant.points += 1
				await contestant.save()
			}
		} catch (e) {
			console.log(e)
		}
	}
}

// TODO:: Error Handling
async function getContest(contestId, host_uid = null, lean = true) {
	let query = {
		_id: contestId,
	}

	if (host_uid) {
		query.host_uid = host_uid
	}

	if (lean) {
		return await Contest.findOne(query)
			.lean()
			.exec()
	} else {
		return await Contest.findOne(query).exec()
	}
}

function validateComment(comment) {
	const pattern = /^q([0-9]{1,3}) (a|b|c|d)$/i
	let matches = comment.match(pattern)

	if (matches) {
		return {
			question: matches[1],
			answer: matches[2],
		}
	}

	return false
}

async function isAlreadySubmitted(questionId, uid) {
	let submission = await Submission.find({
		questionId: questionId,
		uid: uid,
	})
		.lean()
		.exec()

	return submission.length > 0
}

async function getCurrentQuestion(questionId) {
	const currentQuestion = await Question.findById(questionId)
		.select('correct_answer')
		.lean()
		.exec()

	return currentQuestion
}

async function createNewSubmission(
	uid,
	contestId,
	answer,
	correct_answer,
	questionId,
	timeTaken
) {
	const newSubmission = new Submission({
		uid: uid,
		contestId: contestId,
		answer: answer,
		isRight: answer === correct_answer,
		questionId: questionId,
		timeTaken: timeTaken,
	})

	try {
		await newSubmission.save()
		return newSubmission
	} catch (e) {
		console.log(e)
		return false
	}
}

async function findContestantWithChannelId(channelId, contestId) {
	let contestant = await Contestant.findOne({
		channelId: channelId,
		contestId: contestId,
	}).exec()

	return contestant
}

async function incrementContestantPoint(contestantUid, contestId) {
	const contestantPoint = await Point.findOne({
		uid: contestantUid,
		contestId: contestId,
	})
	contestantPoint.points += 1

	try {
		await contestantPoint.save()
		return true
	} catch (e) {
		console.log(e)
		return false
	}
}

export default router
