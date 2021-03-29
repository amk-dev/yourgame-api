import express from 'express'
import AuthMiddleware from '../middlewares/Auth.js'
import { attachUserDataIfAvailable } from '../middlewares/Auth.js'

import Contest from './../models/Contest'
import Question from './../models/Question'
import Winning from './../models/Winning'

import {
	getContestDetailsWithoutQuestions,
	hasUserJoinedTheContest,
	getLeaderboard,
	findQuestionById,
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
	// get all of the leaderboard
	let leaderboard = await getLeaderboard(req.contestId, false)

	// update their winnings
	let contestWinnings = {
		1: 100,
		2: 75,
		3: 50,
		4: 25,
		5: 10,
		6: 10,
		7: 10,
		8: 10,
		9: 10,
	}

	let winnings = []

	for (let i = 0; i < 9; i++) {
		if (i < leaderboard.length) {
			let position = i + 1

			winnings.push({
				uid: leaderboard[i].uid,
				contestId: req.contestId,
				amount: contestWinnings[position],
			})
		} else {
			break
		}
	}

	try {
		await Winning.insertMany(winnings, {
			ordered: false,
		})
	} catch (err) {
		if (err.code != 11000) {
			console.log(err)
		}
	}

	// update the leaderboard for contest
	let contest = await Contest.findById(req.contestId).exec()
	contest.leaderboard = leaderboard

	contest.status = 'ended'
	try {
		await contest.save()

		return res.send({
			success: true,
		})
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

		contestant.joinedContests[0].submissions.push(newSubmission)

		if (isRightAnswer) {
			contestant.joinedContests[0].points += 1
		}

		contestant.joinedContests[0].timeTaken += timeTaken

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

export default router
