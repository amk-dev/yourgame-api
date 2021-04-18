import Contest from './../../models/Contest'
import User from './../../models/User'

export async function isContestantTheCreator(req, res, next) {
	let contest = req.contest

	if (contest.host_uid == req.uid) {
		return res.status(400).send({
			error: true,
			message: 'host-cannot-join-the-contest',
		})
	}

	next()
}

export async function hasEnoughBalanceToJoin(req, res, next) {
	try {
		let user = req.user

		let winnings = user.winnings
		let bonus = user.bonus

		let totalAmount = winnings + bonus

		if (user.bonus >= 10) {
			user.bonus -= 10
		} else if (totalAmount >= 10) {
			user.winnings -= 10 - user.bonus
			user.bonus = 0
		} else {
			return res.status(400).send({
				error: true,
				message: 'not-enough-balance',
			})
		}

		user.transactionsHistory.push({
			amount: -10,
			event: 'joined-contest',
			time: new Date().getTime(),
		})

		next()
	} catch (error) {
		return res.status(500).send({
			error: true,
			message: 'something-went-wrong',
		})
	}
}

export async function isCreator(req, res, next) {
	try {
		let user = req.user

		if (!user.isCreator) {
			return res.status(401).send({
				error: true,
				message: 'not-a-creator',
			})
		}
	} catch (err) {
		return res.status(500).send({
			error: true,
			message: 'something-went-wrong',
		})
	}

	next()
}

export async function haveContestId(req, res, next) {
	let contestId = req.params.contestId

	if (!contestId) {
		return res.status(400).send({
			error: true,
			message: 'contest-id-required',
		})
	}

	req.contestId = contestId

	next()
}

export async function haveAnswer(req, res, next) {
	const answer = req.body.answer

	if (!answer) {
		return res.status(400).send({
			error: true,
			message: 'answer-is-required',
		})
	}

	req.answer = answer

	next()
}

export async function hasYoutubeIdInBody(req, res, next) {
	const youtubeVideoId = req.body.youtubeVideoId

	if (!youtubeVideoId) {
		return res.send({
			error: true,
			message: 'youtube-video-id-is-required',
		})
	}

	next()
}

export async function hasContestTimeInBody(req, res, next) {
	const contestTime = req.body.contestTime

	if (!contestTime) {
		return res.send({
			error: true,
			message: 'contest-time-is-required',
		})
	}

	next()
}

export async function doesContestExists(req, res, next) {
	try {
		const contest = await Contest.findOne({ _id: req.contestId }).select({
			status: 1,
			host_uid: 1,
		})

		if (!contest) {
			return res.status(400).send({
				error: true,
				message: 'contest-does-not-exists',
			})
		}

		req.contest = contest

		next()
	} catch (e) {
		return res.status(500).send({
			error: true,
			message: 'something-went-wrong',
		})
	}
}

export async function doesContestByHostExist(req, res, next) {
	let contest = await getContest(req.contestId, req.uid, false)

	if (!contest) {
		return res.status(400).send({
			error: true,
			message: 'contest-does-not-exist',
		})
	}

	req.contest = contest
	next()
}

export async function attachContestToRequest(req, res, next) {
	try {
		let contest = await getContest(req.contestId, null, false)
		req.contest = contest
		next()
	} catch (error) {
		return res.status(500).send({
			error: true,
			message: 'cannot-get-contest',
		})
	}
}

export async function isContestLive(req, res, next) {
	if (req.contest.status == 'live') {
		return res.status(400).send({
			error: true,
			message: 'contest-already-started',
		})
	}
	next()
}

export async function isContestUpcoming(req, res, next) {
	if (req.contest.status != 'upcoming') {
		return res.status(400).send({
			error: true,
			message: 'contest-already-started',
		})
	}
	next()
}

export async function hasContestStarted(req, res, next) {
	if (req.contest.status == 'upcoming') {
		return res.status(400).send({
			error: true,
			message: 'contest-not-started',
		})
	}

	next()
}

export function isValidAnswer(req, res, next) {
	let answer = req.answer
	if (!['A', 'B', 'C', 'D'].includes(answer)) {
		return res.status(400).send({
			error: true,
			message: 'invalid-answer',
		})
	}

	next()
}
export async function isContestant(req, res, next) {
	const contestant = await findContestant(req.contestId, req.uid)
	if (!contestant) {
		return res.status(400).send({
			error: true,
			message: 'user-not-registered',
		})
	}

	req.contestant = contestant

	next()
}

export async function isAlreadyJoined(req, res, next) {
	const contestant = await findContestant(req.contestId, req.uid)
	if (contestant) {
		return res.status(400).send({
			error: true,
			message: 'already-joined',
		})
	}

	req.contestant = contestant

	next()
}

export async function isQuestionAlreadyAnswered(req, res, next) {
	let contest = req.contest
	const currentQuestionId = contest.questions[contest.currentQuestion - 1]

	let user = await User.findOne({
		uid: req.uid,
		'joinedContests.contest': contest._id,
		'joinedContests.contest.submissions.questionId': currentQuestionId,
	})
		.select('joinedContests')
		.lean()
		.exec()

	if (user) {
		return res.status(400).send({
			error: true,
			message: 'question-already-answered',
		})
	}

	next()
}

export async function isAnsweringOpen(req, res, next) {
	if (req.contest.currentQuestionStatus != 'open') {
		return res.status(400).send({
			error: true,
			message: 'answering-not-open',
		})
	}

	next()
}

export async function isAllQuestionsFinished(req, res, next) {
	if (req.contest.currentQuestion + 1 > 10) {
		return res.status(400).send({
			error: true,
			message: 'all-questions-finished',
		})
	}

	next()
}

export async function haveMoreQuestions(req, res, next) {
	if (req.contest.currentQuestion != 10) {
		return res.status(400).send({
			error: true,
			message: 'not-all-questions-finished',
		})
	}

	next()
}

export async function isContestEnded(req, res, next) {
	if (req.contest.status == 'ended') {
		return res.status(400).send({
			error: true,
			message: 'contest-already-ended',
		})
	}

	next()
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
		return await Contest.findOne(query).lean().exec()
	} else {
		return await Contest.findOne(query).exec()
	}
}

async function findContestant(contestId, uid) {
	let contestant = await User.findOne({
		uid: uid,
		'joinedContests.contest': contestId,
	}).exec()

	return contestant
}
