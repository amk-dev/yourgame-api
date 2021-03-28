import Contest from './../../models/Contest.js'
import User from './../../models/User.js'

export async function getContestDetailsWithoutQuestions(contestId) {
	let contest = await Contest.findById(contestId)
		.select({
			questions: 0,
		})
		.lean()
		.exec()

	return contest
}

export async function hasUserJoinedTheContest(uid, contestId) {
	let user = await User.findOne({
		uid: uid,
		'joinedContests.contest': contestId,
	})

	return !!user
}
