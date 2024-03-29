import { getJoinedContestsForUser, getLeaderboard } from './../utils.js'
import {
	buildUser,
	buildContest,
	getPoints,
	getTimeTaken,
	sortLeaderboardManually,
	generateUsersForTestingLeaderboard,
} from './../../../../test/testutils.js'

import mongoose from 'mongoose'
import User from '../../../models/User.js'
import Contest from '../../../models/Contest.js'

beforeAll(async () => {
	await mongoose.connect('mongodb://localhost:27017/yourgame-test-db', {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
	})
})

afterAll(async () => {
	await mongoose.disconnect()
})

describe('getJoinedContestsForUser', () => {
	beforeEach(async () => {
		// clear user and contest collections
		await User.deleteMany()
		await Contest.deleteMany()
	})

	test('return joinedContests with contest details', async () => {
		let user = await buildUser()
		let contest = await buildContest({
			host_uid: user.uid,
			host_picture: user.picture,
			host_display_name: user.displayName,
		})

		user.joinedContests = [
			{
				contest: contest._id,
				points: getPoints(),
				timeTaken: getTimeTaken(),
			},
		]
		await user.save()

		let joinedContests = await getJoinedContestsForUser(user.uid)

		expect(joinedContests[0].host_picture).toBe(user.picture)
		expect(joinedContests[0].host_display_name).toBe(user.displayName)
	})
})

describe('getLeaderboard', () => {
	test('gets the top10 leaderboard', async () => {
		await User.deleteMany()
		await Contest.deleteMany()

		let contest = await buildContest()
		let users = await generateUsersForTestingLeaderboard(20, contest._id)

		let manuallyGeneratedLeaderboard = sortLeaderboardManually(users)
		let leaderboard = await getLeaderboard(contest._id)

		expect(leaderboard).toStrictEqual(manuallyGeneratedLeaderboard)
	})
	test('gets the entire leaderboard', async () => {
		await User.deleteMany()
		await Contest.deleteMany()

		let contest = await buildContest()
		let users = await generateUsersForTestingLeaderboard(20, contest._id)

		let manuallyGeneratedLeaderboard = sortLeaderboardManually(users, false)
		let leaderboard = await getLeaderboard(contest._id, false)

		expect(leaderboard).toStrictEqual(manuallyGeneratedLeaderboard)
	})
})
