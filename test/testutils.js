import mongoose from 'mongoose'
import faker from 'faker'
import User from '../src/models/User'
import Contest from '../src/models/Contest'

export function buildReq(overrides) {
	return {
		uid: 1001,
		...overrides,
	}
}

export function buildRes(overrides) {
	let res = {
		status: jest.fn(() => res),
		send: jest.fn(() => res),
		...overrides,
	}
	return res
}

export function buildNext(impl) {
	return jest.fn(impl).mockName('next')
}

export const getContestId = () => mongoose.Types.ObjectId()
export const getUid = () => faker.datatype.uuid()
export const getEmail = () => faker.internet.email()
export const getPicture = () => faker.image.people()
export const getDisplayName = () => faker.name.firstName()
export const getYoutubeVideoId = () => faker.random.word()
export const getStartTime = () => faker.time.recent()
export const getPoints = () => faker.datatype.number(10)
export const getTimeTaken = () => faker.datatype.number(100)

export async function buildUser(overrides) {
	let user = new User({
		uid: getUid(),
		email: getEmail(),
		picture: getPicture(),
		displayName: getDisplayName(),
		...overrides,
	})

	await user.save()
	return user
}

export async function buildContest(overrides) {
	let contest = new Contest({
		_id: getContestId(),
		host_uid: getUid(),
		host_picture: getPicture(),
		host_display_name: getDisplayName(),
		youtubeVideoId: getYoutubeVideoId(),
		startTime: getStartTime(),
		status: 'upcoming',
		...overrides,
	})

	await contest.save()
	return contest
}

export async function generateUsersForTestingLeaderboard(
	n,
	contestId,
	lean = true
) {
	let users = new Array(n)

	for (let i = 0; i < n; i++) {
		let user = await buildUser({
			joinedContests: [
				{
					contest: contestId,
					points: getPoints(),
					timeTaken: getTimeTaken(),
				},
			],
		})

		if (lean) {
			user = user.toObject()
			let leaderboardItem = {
				_id: user._id,
				uid: user.uid,
				picture: user.picture,
				displayName: user.displayName,
				points: user.joinedContests[0].points,
				timeTaken: user.joinedContests[0].timeTaken,
			}

			users[i] = leaderboardItem
		}
	}

	return users
}

export function sortLeaderboardManually(users, top10 = true) {
	users.sort(
		(user1, user2) =>
			user2.points - user1.points || user1.timeTaken - user2.timeTaken
	)

	return top10 ? users.slice(0, 10) : users
}
