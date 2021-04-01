import Contest from './../../models/Contest.js'
import User from './../../models/User.js'
import Question from './../../models/Question.js'

import mongoose from 'mongoose'

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
	try {
		let newContest = new Contest({
			host_uid,
			host_picture,
			host_display_name,
			youtubeVideoId,
			startTime,
			status,
		})

		await newContest.save()
		return newContest
	} catch (e) {
		console.log(e)
		return false
	}
}

export async function getContestsByHostUid(host_uid) {
	let contests = await Contest.find({
		host_uid,
	})
		.sort({
			startTime: -1,
		})
		.lean()
		.exec()

	return contests
}

export async function getJoinedContestsForUser(uid) {
	let user = await User.aggregate([
		{ $match: { uid: uid } },
		{
			$lookup: {
				from: 'contests',
				localField: 'joinedContests.contest',
				foreignField: '_id',
				as: 'joinedContests',
			},
		},
		{
			$project: {
				'joinedContests._id': 1,
				'joinedContests.host_display_name': 1,
				'joinedContests.host_picture': 1,
				'joinedContests.startTime': 1,
				'joinedContests.status': 1,
			},
		},
	]).exec()

	return user[0].joinedContests
}

export async function getLeaderboard(contestId, top10 = true) {
	let stages = [
		{
			$match: {
				'joinedContests.contest': mongoose.Types.ObjectId(contestId),
			},
		},
		{
			$project: {
				uid: 1,
				displayName: 1,
				picture: 1,
				joinedContests: {
					$filter: {
						input: '$joinedContests',
						as: 'joinedContest',
						cond: {
							$eq: [
								'$$joinedContest.contest',
								mongoose.Types.ObjectId(contestId),
							],
						},
					},
				},
			},
		},
		{
			$unwind: '$joinedContests',
		},
		{
			$project: {
				uid: 1,
				displayName: 1,
				picture: 1,
				points: '$joinedContests.points',
				timeTaken: '$joinedContests.timeTaken',
			},
		},
		{
			$sort: {
				points: -1,
				timeTaken: 1,
			},
		},
	]

	if (top10) {
		stages.push({
			$limit: 10,
		})
	}

	let leaderboard = await User.aggregate(stages)

	return leaderboard
}

export async function findQuestionById(questionId) {
	let question = await Question.findById(questionId).lean().exec()
	return question
}

export async function findUserByUid(uid, lean = true) {
	let user

	if (lean) {
		user = await User.findOne({ uid: uid }).lean().exec()
	} else {
		user = await User.findOne({ uid: uid }).exec()
	}

	return user
}

export async function addWinningForUser(uid, amount) {
	let user = await findUserByUid(uid, false)
	user.winnings += amount
	user.transactionsHistory.push({
		amount: amount,
		event: 'winning',
		time: new Date().getTime(),
	})
	user.save()
}

export async function setContestStatus(contestId, status) {
	let contest = await Contest.findByIdAndUpdate(
		contestId,
		{
			status: status,
		},
		{ new: true }
	)

	return contest
}

export async function updateContestWinners(leaderboard) {
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

	let updateRequests = []

	for (let i = 0; i < 9; i++) {
		if (i < leaderboard.length) {
			let position = i + 1
			updateRequests.push(
				addWinningForUser(leaderboard[i].uid, contestWinnings[position])
			)
		} else {
			break
		}
	}

	await Promise.all(updateRequests)

	return true
}
