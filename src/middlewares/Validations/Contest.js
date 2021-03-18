import Contest from './../../models/Contest'
import Contestant from './../../models/Contestant'
import Submission from './../../models/Submission'

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

export async function doesContestExists(req, res, next) {
	try {
		const contest = await Contest.findOne({ _id: req.contestId }).select({
			status: 1,
			host_uid: 1,
		})

		req.contest = contest

		if (!contest) {
			return res.status(400).send({
				error: true,
				message: 'contest-does-not-exists',
			})
		}

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
	let contest = await Contest.findById(req.contestId).exec()

	const currentQuestionId = contest.questions[contest.currentQuestion - 1]
	let submission = await isAlreadySubmitted(currentQuestionId, req.uid)

	if (submission) {
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
		return await Contest.findOne(query)
			.lean()
			.exec()
	} else {
		return await Contest.findOne(query).exec()
	}
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

async function findContestant(contestId, uid) {
	let contestant = await Contestant.findOne({
		contest: contestId,
		uid: uid,
	}).exec()

	return contestant
}
