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

const getContestId = () => mongoose.Types.ObjectId()
const getUid = () => faker.random.uuid()
const getEmail = () => faker.internet.email()
const getPicture = () => faker.image.people()
const getDisplayName = () => faker.name.firstName()
const getYoutubeVideoId = () => faker.random.word()
const getStartTime = () => faker.time.recent()

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
