import express from 'express'
import AuthMiddleware from '../middlewares/Auth.js'
import { attachUserDataIfAvailable } from '../middlewares/Auth.js'

import Question from './../models/Question'

import ContestEventEmitter from './../ContestEventEmitter.js'

import {
	getContestDetailsWithoutQuestions,
	hasUserJoinedTheContest,
	getLeaderboard,
	findQuestionById,
	updateContestWinners,
	setContestStatus,
	getContestStatus,
} from './utils/utils.js'

import {
	doesContestByHostExist,
	haveAnswer,
	haveContestId,
	isContestant,
	isContestLive,
	hasContestStarted,
	isQuestionAlreadyAnswered,
	isValidAnswer,
	isAllQuestionsFinished,
	attachContestToRequest,
	isAnsweringOpen,
	doesContestExists,
	isContestantTheCreator,
	isAlreadyJoined,
	haveMoreQuestions,
	isContestEnded,
	hasEnoughBalanceToJoin,
	isContestUpcoming,
} from '../middlewares/Validations/Contest.js'

let router = express.Router({
	mergeParams: true,
})

router.get(
	'/details',
	attachUserDataIfAvailable,
	haveContestId,
	sendContestDetails
)

router.post(
	'/join',
	AuthMiddleware,
	haveContestId,
	doesContestExists,
	isContestLive,
	isContestantTheCreator,
	isAlreadyJoined,
	hasEnoughBalanceToJoin,
	joinContest
)

router.post(
	'/closeCurrentQuestion',
	AuthMiddleware,
	haveContestId,
	doesContestByHostExist,
	closeCurrentQuestion
)

// Should Generate The Questions And Return The First Question
router.post(
	'/start',
	AuthMiddleware,
	haveContestId,
	doesContestByHostExist,
	isContestLive,
	startContest
)

router.post(
	'/startvideo',
	AuthMiddleware,
	haveContestId,
	doesContestByHostExist,
	isContestUpcoming,
	startVideo
)

router.get(
	'/nextquestion',
	AuthMiddleware,
	haveContestId,
	doesContestByHostExist,
	isAllQuestionsFinished,
	sendNextQuestion
)

router.post(
	'/end',
	AuthMiddleware,
	haveContestId,
	doesContestByHostExist,
	haveMoreQuestions,
	isContestEnded,
	endContest
)

// TODO:: Move All The Repeating Parts Into Different Functions
router.get('/leaderboard', haveContestId, sendLeaderboard)

router.post(
	'/answer',
	AuthMiddleware,
	haveContestId,
	haveAnswer,
	isValidAnswer,
	isContestant,
	attachContestToRequest,
	isQuestionAlreadyAnswered,
	hasContestStarted,
	isAnsweringOpen,
	answerQuestion
)

const streamContestStatus = getStreamContestStatusFunction()
router.get('/streams/status', haveContestId, streamContestStatus)

export async function sendContestDetails(req, res) {
	try {
		let contest = await getContestDetailsWithoutQuestions(req.contestId)

		if (req.uid) {
			contest.isCreator = contest.host_uid == req.uid
			contest.isJoined = contest.isCreator
				? false
				: await hasUserJoinedTheContest(req.uid, req.contestId)
		} else {
			contest.isJoined = false
			contest.isCreator = false
		}

		return res.send(contest)
	} catch (error) {
		return res.status(500).send({
			error: true,
			message: 'something-went-wrong',
		})
	}
}

export async function joinContest(req, res) {
	try {
		let contestId = req.contestId
		let user = req.user
		user.joinedContests.push({
			contest: contestId,
		})

		await user.save()
		return res.send({
			success: true,
		})
	} catch (e) {
		console.log(e)
		return res.status(500).send({
			error: true,
			message: 'cannot-join-contest',
		})
	}
}

export async function closeCurrentQuestion(req, res) {
	try {
		let contest = req.contest
		contest.currentQuestionStatus = 'closed'

		let currentQuestionId = contest.questions[contest.currentQuestion - 1]

		const question = await Question.findById(currentQuestionId)
			.select('correct_answer')
			.lean()
			.exec()

		await contest.save()

		return res.send(question)
	} catch (e) {
		return res.status(500).send({
			error: true,
			message: 'something-went-wrong',
		})
	}
}

export async function startContest(req, res) {
	// pick random sample for questions
	let contest = req.contest

	let questions = await Question.aggregate([
		{
			$project: {
				correct_answer: 0,
			},
		},
	]).sample(10)

	// TODO:: Embedd Question Rather Than Just QuestionIds
	let questionIds = questions.reduce(function getQuestionIds(
		questionIds,
		question
	) {
		questionIds.push(question._id)
		return questionIds
	},
	[])

	contest.status = 'live'
	contest.questions = questionIds
	contest.currentQuestion = 1
	contest.currentQuestionReleaseTime = Date.now()
	contest.currentQuestionStatus = 'open'

	try {
		await contest.save()
		return res.send({
			question: {
				...questions[0],
				questionNumber: contest.currentQuestion,
			},
		})
	} catch (e) {
		console.log(e)
		return res.status(500).send({
			error: true,
		})
	}
}

async function sendNextQuestion(req, res) {
	let contest = req.contest

	let nextQuestion = await Question.findById(
		contest.questions[contest.currentQuestion]
	)
		.select('name option_a option_b option_c option_d')
		.lean()
		.exec()

	contest.currentQuestion += 1
	contest.currentQuestionStatus = 'open'
	contest.currentQuestionReleaseTime = Date.now()

	try {
		await contest.save()

		return res.send({
			question: {
				...nextQuestion,
				questionNumber: contest.currentQuestion,
			},
		})
	} catch (e) {
		console.log(e)
		return res.status(500).send({
			error: true,
		})
	}
}

export async function endContest(req, res) {
	try {
		// get all of the leaderboard
		let leaderboard = await getLeaderboard(req.contestId, false)
		await updateContestWinners(leaderboard, req.contestId)
		await setContestStatus(req.contestId, 'ended')

		ContestEventEmitter.emit('status-changed ', {
			contestId: req.contestId,
			status: 'ended',
		})

		return res.send({ success: true })
	} catch (err) {
		console.log(err)
		return res.status(500).send({
			error: true,
			message: 'something-went-wrong',
		})
	}
}

export async function sendLeaderboard(req, res) {
	try {
		let leaderboard = await getLeaderboard(req.contestId)

		res.send(leaderboard)
	} catch (e) {
		console.log(e)

		res.status(500).send({
			error: true,
			message: 'cannot-get-leaderboard',
		})
	}
}

export async function answerQuestion(req, res) {
	try {
		let contest = req.contest
		let contestant = req.contestant

		// create a new submission
		let answeredTime = Date.now()
		let timeTaken = answeredTime - contest.currentQuestionReleaseTime
		let currentQuestionId = contest.questions[contest.currentQuestion - 1]
		let currentQuestion = await findQuestionById(currentQuestionId)

		let answer = req.answer
		let isRightAnswer =
			answer.toLowerCase() === currentQuestion.correct_answer

		let newSubmission = {
			contest: contest._id,
			answer: req.answer,
			isRight: isRightAnswer,
			questionId: currentQuestionId,
			answeredTime: answeredTime,
			timeTaken: timeTaken,
		}

		let joinedContest = contestant.joinedContests.filter(
			(joinedContest) => {
				return joinedContest.contest.toString() == contest._id
			}
		)[0]

		joinedContest.submissions.push(newSubmission)

		if (isRightAnswer) {
			joinedContest.points += 1
		}

		joinedContest.timeTaken += timeTaken

		await contestant.save()

		return res.send({
			success: true,
		})
	} catch (e) {
		console.log(e)
		return res.send({
			error: true,
		})
	}
}

export async function startVideo(req, res) {
	try {
		await setContestStatus(req.contestId, 'video-live')

		ContestEventEmitter.emit('status-changed', {
			contestId: req.contestId,
			status: 'video-live',
		})

		return res.send({
			success: true,
		})
	} catch (error) {
		return res.status(500).send({
			error: true,
			message: 'something-went-wrong',
		})
	}
}

function getStreamContestStatusFunction() {
	let sentStatuses = {}

	async function streamContestStatus(req, res) {
		let currentContestId = req.contestId

		setSseHeaders()
		setupContestStatusChangeHandlers()
		setupClientTerminationHandlers()
		await sendCurrentStatusToClient()

		function setSseHeaders() {
			res.writeHead(200, {
				Connection: 'keep-alive',
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
			})
		}

		function setupContestStatusChangeHandlers() {
			ContestEventEmitter.on('status-changed', sendStatusChangeToClient)
		}

		function setupClientTerminationHandlers() {
			req.on('close', () => {
				if (!res.finished) {
					res.end()
				}
				ContestEventEmitter.removeListener(
					'status-changed',
					sendStatusChangeToClient
				)
			})
		}

		async function sendCurrentStatusToClient() {
			let currentContestStatus = await getContestStatus(currentContestId)
			sendStatusChangeToClient({
				status: currentContestStatus.status,
				contestId: currentContestId,
			})
		}

		async function sendStatusChangeToClient({ status, contestId }) {
			if (contestId == currentContestId) {
				if (!sentStatuses[contestId]) {
					writeResponse()
					return
				}

				if (isCurrentStatusLatest(status, sentStatuses[contestId])) {
					writeResponse()
				}
			}

			function writeResponse() {
				let data = {
					contest: contestId,
					status: status,
				}

				res.write(`data: ${JSON.stringify(data)}`)
				res.write('\n\n')

				sentStatuses[contestId] = status
			}
		}
	}

	return streamContestStatus
}

async function isCurrentStatusLatest(currentStatus, lastStatus) {
	let order = {
		upcoming: 0,
		'video-live': 1,
		live: 2,
		end: 3,
	}

	return order[currentStatus] > order[lastStatus]
}

export default router
