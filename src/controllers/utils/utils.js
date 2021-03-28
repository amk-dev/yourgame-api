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

export async function addRefferalBonus(refferedBy) {
	try {
		let user = await User.findOne({
			uid: refferedBy,
		}).exec()

		let referrlCount = (
			await User.find({
				refferedBy: refferedBy,
			})
				.lean()
				.exec()
		).length

		if (referrlCount % 3 == 0) {
			user.bonus += 50
			user.transactionsHistory.push({
				amount: 50,
				event: 'referral',
				time: new Date().getTime(),
			})
			await user.save()
		}
	} catch (error) {
		console.log('Adding Refferal Bonus Failed')
		console.log(error)
	}
}

export async function createNewContest(
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
