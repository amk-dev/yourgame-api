import { describe, test, expect, beforeEach } from '@jest/globals'
import {
	isContestantTheCreator,
	hasEnoughBalanceToJoin,
	isCreator,
	haveContestId,
	haveAnswer,
	doesContestExists,
} from './../Contest.js'
import User from '../../../models/User.js'
import Contest from '../../../models/Contest.js'

import { buildReq, buildRes, buildNext } from './../../../../test/testutils.js'

jest.mock('../../../models/User.js')
jest.mock('../../../models/Contest.js')

beforeEach(() => {
	jest.clearAllMocks()
})

describe('isContestantTheCreator', () => {
	test('respond with error when host_uid == uid', async () => {
		let req = buildReq({ contest: { host_uid: 1001 } })
		let res = buildRes()
		let next = buildNext()

		await isContestantTheCreator(req, res, next)

		expect(res.status.mock.calls).toMatchObject([[400]])
		expect(res.send.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    Object {
		      "error": true,
		      "message": "host-cannot-join-the-contest",
		    },
		  ],
		]
	`)
		expect(next).toHaveBeenCalledTimes(0)
	})

	test('call next when no error', async () => {
		let req = buildReq({ contest: { host_uid: 1001 }, uid: 1002 })
		let res = buildRes()
		let next = buildNext()

		await isContestantTheCreator(req, res, next)

		expect(res.status).toHaveBeenCalledTimes(0)
		expect(res.send).toHaveBeenCalledTimes(0)

		expect(next).toHaveBeenCalledWith()
		expect(next).toHaveBeenCalledTimes(1)
	})
})

describe('hasEnoughBalanceToJoin', () => {
	test('bonus+winnings not enough', async () => {
		let req = buildReq()
		let res = buildRes()
		let next = buildNext()

		req.user = {
			winnings: 3,
			bonus: 4,
			transactionsHistory: [],
		}

		await hasEnoughBalanceToJoin(req, res, next)

		expect(res.status.mock.calls).toMatchObject([[400]])
		expect(res.send.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    Object {
		      "error": true,
		      "message": "not-enough-balance",
		    },
		  ],
		]
	`)

		expect(req.user.winnings).toBe(3)
		expect(req.user.bonus).toBe(4)
		expect(req.user.transactionsHistory).toMatchObject([])
	})

	test('bonus available is greater than the entry fee', async () => {
		let req = buildReq()
		let res = buildRes()
		let next = buildNext()

		let getTimeMock = jest
			.spyOn(Date.prototype, 'getTime')
			.mockImplementation(() => 'mockedTime')

		req.user = {
			bonus: 20,
			winnings: 10,
			transactionsHistory: [],
			save: jest.fn(),
		}

		await hasEnoughBalanceToJoin(req, res, next)

		expect(req.user.bonus).toBe(10)
		expect(req.user.winnings).toBe(10)

		expect(req.user.transactionsHistory).toMatchObject([
			{
				amount: -10,
				event: 'joined-contest',
				time: new Date().getTime(),
			},
		])
		expect(req.user.save.mock.calls).toMatchObject([[]])
		expect(next.mock.calls).toMatchObject([[]])

		getTimeMock.mockRestore()
	})

	test('winnings available', async () => {
		let req = buildReq()
		let res = buildRes()
		let next = buildNext()

		let getTimeMock = jest
			.spyOn(Date.prototype, 'getTime')
			.mockImplementation(() => 'mockedTime')

		req.user = {
			bonus: 0,
			winnings: 20,
			transactionsHistory: [],
			save: jest.fn(),
		}

		await hasEnoughBalanceToJoin(req, res, next)

		expect(req.user.bonus).toBe(0)
		expect(req.user.winnings).toBe(10)
		expect(req.user.transactionsHistory).toMatchObject([
			{
				amount: -10,
				event: 'joined-contest',
				time: new Date().getTime(),
			},
		])

		expect(req.user.transactionsHistory).toMatchObject([
			{
				amount: -10,
				event: 'joined-contest',
				time: new Date().getTime(),
			},
		])
		expect(req.user.save.mock.calls).toMatchObject([[]])
		expect(next.mock.calls).toMatchObject([[]])

		getTimeMock.mockRestore()
	})

	test('take bonus, and remaining from winnings', async () => {
		let req = buildReq()
		let res = buildRes()
		let next = buildNext()

		let getTimeMock = jest
			.spyOn(Date.prototype, 'getTime')
			.mockImplementation(() => 'mockedTime')

		req.user = {
			bonus: 3,
			winnings: 20,
			transactionsHistory: [],
			save: jest.fn(),
		}

		await hasEnoughBalanceToJoin(req, res, next)

		expect(req.user.bonus).toBe(0)
		expect(req.user.winnings).toBe(13)

		expect(req.user.transactionsHistory).toMatchObject([
			{
				amount: -10,
				event: 'joined-contest',
				time: new Date().getTime(),
			},
		])
		expect(req.user.save.mock.calls).toMatchObject([[]])
		expect(next.mock.calls).toMatchObject([[]])

		getTimeMock.mockRestore()
	})

	test('handle errors', async () => {
		let req = buildReq()
		let res = buildRes()
		let next = buildNext()

		let getTimeMock = jest
			.spyOn(Date.prototype, 'getTime')
			.mockImplementation(() => 'mockedTime')

		User.bonus = 3
		User.winnings = 20
		User.transactionsHistory = []

		User.findOne.mockImplementationOnce(() => {
			throw 'Error Occured'
		})

		let somethingWentWrongError = {
			error: true,
			message: 'something-went-wrong',
		}

		await hasEnoughBalanceToJoin(req, res, next)

		expect(res.status.mock.calls).toMatchObject([[500]])
		expect(res.send.mock.calls).toMatchObject([[somethingWentWrongError]])

		getTimeMock.mockRestore()
	})
})

describe('isCreator', () => {
	test('send not-a-creator if not a creator', async () => {
		let req = buildReq()
		let res = buildRes()
		let next = buildNext()

		req.user = {
			isCreator: false,
		}

		await isCreator(req, res, next)

		expect(res.status.mock.calls).toMatchObject([[401]])
		expect(res.send.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    Object {
		      "error": true,
		      "message": "not-a-creator",
		    },
		  ],
		]
	`)
		expect(next).toHaveBeenCalledTimes(0)
	})

	test('call next if is a creator', async () => {
		let req = buildReq()
		let res = buildRes()
		let next = buildNext()

		req.user = {
			isCreator: true,
		}

		await isCreator(req, res, next)

		expect(res.status).toHaveBeenCalledTimes(0)
		expect(res.send).toHaveBeenCalledTimes(0)

		expect(next).toHaveBeenCalledTimes(1)
		expect(next).toHaveBeenCalledWith()
	})

	test('handle errors', async () => {
		let req = buildReq()
		let res = buildRes()
		let next = buildNext()

		User.isCreator = true

		User.findOne.mockImplementationOnce(() => {
			throw 'Error Occured'
		})

		let somethingWentWrongError = {
			error: true,
			message: 'something-went-wrong',
		}

		await isCreator(req, res, next)

		expect(res.status.mock.calls).toMatchObject([[500]])
		expect(res.send.mock.calls).toMatchObject([[somethingWentWrongError]])

		expect(next).toHaveBeenCalledTimes(0)
	})
})

describe('haveContestId', () => {
	test('call next if req.params contain contestId', async () => {
		let req = buildReq({ params: { contestId: 'mockContestId' } })
		let res = buildRes()
		let next = buildNext()

		await haveContestId(req, res, next)

		expect(req.contestId).toBe('mockContestId')
		expect(res.send).not.toHaveBeenCalled()
		expect(res.status).not.toHaveBeenCalled()
		expect(next).toHaveBeenCalledTimes(1)
		expect(next).toHaveBeenCalledWith()
	})

	test('send contest-id-required if no contestId param', async () => {
		let req = buildReq({ params: {} })
		let res = buildRes()
		let next = buildNext()

		await haveContestId(req, res, next)

		expect(res.status).toHaveBeenCalledTimes(1)
		expect(res.status).toHaveBeenCalledWith(400)

		expect(res.send).toHaveBeenCalledTimes(1)
		expect(res.send.mock.calls[0]).toMatchInlineSnapshot(`
		Array [
		  Object {
		    "error": true,
		    "message": "contest-id-required",
		  },
		]
	`)

		expect(next).toHaveBeenCalledTimes(0)
	})
})

describe('haveAnswer', () => {
	test('call next if req.params contain answer', async () => {
		let req = buildReq({ body: { answer: 'mockAnswer' } })
		let res = buildRes()
		let next = buildNext()

		await haveAnswer(req, res, next)

		expect(req.answer).toBe('mockAnswer')

		expect(res.send).not.toHaveBeenCalled()
		expect(res.status).not.toHaveBeenCalled()

		expect(next).toHaveBeenCalledTimes(1)
		expect(next).toHaveBeenCalledWith()
	})

	test('send contest-id-required if no contestId param', async () => {
		let req = buildReq({ body: {} })
		let res = buildRes()
		let next = buildNext()

		await haveAnswer(req, res, next)

		expect(res.status).toHaveBeenCalledTimes(1)
		expect(res.status).toHaveBeenCalledWith(400)

		expect(res.send).toHaveBeenCalledTimes(1)
		expect(res.send.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    Object {
		      "error": true,
		      "message": "answer-is-required",
		    },
		  ],
		]
	`)

		expect(next).toHaveBeenCalledTimes(0)
	})
})

describe('doesContestExists', () => {
	test('call next if contest exists', async () => {
		let req = buildReq({ contestId: 'mockContestId' })
		let res = buildRes()
		let next = buildNext()

		await doesContestExists(req, res, next)

		Contest._id = 'mockContestId'

		expect(Contest.findOne.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    Object {
		      "_id": "mockContestId",
		    },
		  ],
		]
		`)

		expect(Contest.select.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    Object {
		      "host_uid": 1,
		      "status": 1,
		    },
		  ],
		]
		`)

		expect(req.contest._id).toBe('mockContestId')

		expect(next).toHaveBeenCalledTimes(1)
		expect(next).toHaveBeenCalledWith()

		expect(res.send).toHaveBeenCalledTimes(0)
		expect(res.status).toHaveBeenCalledTimes(0)
	})

	test('return 400 contest-does-not-exists if contest does not exists', async () => {
		let req = buildReq({ contestId: 'mockContestId' })
		let res = buildRes()
		let next = buildNext()

		Contest.select.mockImplementationOnce(() => null)

		await doesContestExists(req, res, next)

		expect(res.status.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    400,
		  ],
		]
		`)

		expect(res.send.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    Object {
		      "error": true,
		      "message": "contest-does-not-exists",
		    },
		  ],
		]
	`)

		expect(req.contest).toBe(undefined)
		expect(next).toHaveBeenCalledTimes(0)
	})

	test('handle errors', async () => {
		let req = buildReq({ contestId: 'mockContestId' })
		let res = buildRes()
		let next = buildNext()

		Contest.select.mockImplementationOnce(() => {
			throw 'Error Occured'
		})

		await doesContestExists(req, res, next)

		expect(res.send.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    Object {
		      "error": true,
		      "message": "something-went-wrong",
		    },
		  ],
		]
		`)

		expect(res.status.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    500,
		  ],
		]
	`)

		expect(next).toHaveBeenCalledTimes(0)
	})
})
