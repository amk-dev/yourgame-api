import express from 'express'
import AuthMiddleware from '../middlewares/Auth.js'
import { attachUserDataIfAvailable } from '../middlewares/Auth.js'

import Contest from './../models/Contest'
import Contestant from './../models/Contestant'
import Question from './../models/Question'
import Submission from './../models/Submission'
import Winning from './../models/Winning'

import mongoose from 'mongoose'
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
} from '../middlewares/Validations/Contest.js'

let router = express.Router({
	mergeParams: true,
})

router.get('/details', attachUserDataIfAvailable, haveContestId, async function(
	req,
	res
) {
	try {
		let contest = await Contest.findById(req.contestId)
			.select({
				questions: 0,
			})
			.lean()
			.exec()

		if (req.uid) {
			contest.isJoined = !!(await Contestant.findOne({
				uid: req.uid,
				contest: req.contestId,
			}))

			contest.isCreator = contest.host_uid == req.uid
		} else {
			contest.isJoined = false
			contest.isCreator = false
		}

		return res.send(contest)
	} catch (error) {
		if (error instanceof mongoose.Error.CastError) {
			return res.status(400).send({
				// error: true,
				message: 'invalid-contest-id',
			})
		}
	}
})

router.post(
	'/join',
	AuthMiddleware,
	haveContestId,
	doesContestExists,
	isContestLive,
	isContestantTheCreator,
	isAlreadyJoined,
	async function(req, res) {
		let contestId = req.contestId

		let newContestant = new Contestant({
			uid: req.uid,
			contest: contestId,
			points: 0,
		})

		try {
			await newContestant.save()
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
)

router.post(
	'/closeCurrentQuestion',
	AuthMiddleware,
	haveContestId,
	doesContestByHostExist,
	async function(req, res) {
		try {
			let contest = req.contest
			contest.currentQuestionStatus = 'closed'

			let currentQuestionId =
				contest.questions[contest.currentQuestion - 1]

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
)

// Should Generate The Questions And Return The First Question
router.post(
	'/start',
	AuthMiddleware,
	haveContestId,
	doesContestByHostExist,
	isContestLive,
	async function(req, res) {
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
)

router.get(
	'/nextquestion',
	AuthMiddleware,
	haveContestId,
	doesContestByHostExist,
	isAllQuestionsFinished,
	async function(req, res) {
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
)

router.post(
	'/end',
	AuthMiddleware,
	haveContestId,
	doesContestByHostExist,
	haveMoreQuestions,
	isContestEnded,
	async function(req, res) {
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
)

// TODO:: Move All The Repeating Parts Into Different Functions
router.get('/leaderboard', haveContestId, async function(req, res) {
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
})

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
	async function(req, res) {
		let contest = req.contest
		let contestant = req.contestant

		// create a new submission
		let answeredTime = Date.now()
		let timeTaken = answeredTime - contest.currentQuestionReleaseTime

		let currentQuestionId = contest.questions[contest.currentQuestion - 1]
		let currentQuestion = await Question.findById(currentQuestionId)
			.lean()
			.exec()

		try {
			const newSubmission = await createNewSubmission(
				contestant.uid,
				contest._id,
				req.answer,
				currentQuestion.correct_answer,
				currentQuestionId,
				answeredTime,
				timeTaken
			)

			res.send({
				success: true,
			})
		} catch (e) {
			console.log(e)
			res.send({
				error: true,
			})
		}
	}
)

async function createNewSubmission(
	uid,
	contestId,
	answer,
	correct_answer,
	questionId,
	answeredTime,
	timeTaken
) {
	let isRight = answer.toLowerCase() === correct_answer

	const newSubmission = new Submission({
		uid: uid,
		contestId: contestId,
		answer: answer,
		isRight: isRight,
		questionId: questionId,
		answeredTime: answeredTime,
		timeTaken: timeTaken,
		point: isRight ? 1 : 0,
	})

	try {
		await newSubmission.save()
		return newSubmission
	} catch (e) {
		console.log(e)
		return false
	}
}

async function getLeaderboard(contestId, top10 = true) {
	let stages = [
		{ $match: { contestId: mongoose.Types.ObjectId(contestId) } },
		{
			$group: {
				_id: '$uid',
				totalTimeTaken: {
					$sum: '$timeTaken',
				},
				totalPoints: {
					$sum: '$point',
				},
				uid: {
					$first: '$uid',
				},
			},
		},
		{
			$sort: {
				totalPoints: -1,
				totalTimeTaken: 1,
			},
		},
	]

	if (top10) {
		stages.push({
			$limit: 10,
		})
	}

	let result = await Submission.aggregate(stages).exec()

	let leaderboard = await Submission.populate(result, {
		path: 'user',
		select: 'displayName picture',
	})

	return leaderboard
}

export default router
