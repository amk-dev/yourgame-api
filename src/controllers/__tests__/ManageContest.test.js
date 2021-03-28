import { sendContestDetails } from '../ManageContest.js'
import {
	getContestDetailsWithoutQuestions,
	hasUserJoinedTheContest,
} from '../utils/utils.js'

import { buildReq, buildRes } from './../../../test/testutils.js'

jest.mock('../utils/utils.js')

beforeEach(() => {
	jest.clearAllMocks()
})

describe('sendContestDetails', () => {
	test('return contest details when the user is the creator', async () => {
		let req = buildReq({
			contestId: 'mockContestId',
		})
		let res = buildRes()

		getContestDetailsWithoutQuestions.mockResolvedValueOnce({
			host_uid: 1001,
		})

		await sendContestDetails(req, res)

		expect(getContestDetailsWithoutQuestions.mock.calls)
			.toMatchInlineSnapshot(`
		Array [
		  Array [
		    "mockContestId",
		  ],
		]
		`)

		expect(hasUserJoinedTheContest).not.toHaveBeenCalled()

		expect(res.send.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    Object {
		      "host_uid": 1001,
		      "isCreator": true,
		      "isJoined": false,
		    },
		  ],
		]
	`)
	})

	test('set isCreator when host_uid != req.uid', async () => {
		let req = buildReq({
			contestId: 'mockContestId',
		})
		let res = buildRes()

		getContestDetailsWithoutQuestions.mockResolvedValueOnce({
			host_uid: 1002,
		})
		hasUserJoinedTheContest.mockResolvedValueOnce(true)

		await sendContestDetails(req, res)

		expect(getContestDetailsWithoutQuestions.mock.calls)
			.toMatchInlineSnapshot(`
		Array [
		  Array [
		    "mockContestId",
		  ],
		]
	`)

		expect(hasUserJoinedTheContest.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    1001,
		    "mockContestId",
		  ],
		]
	`)

		expect(res.send.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    Object {
		      "host_uid": 1002,
		      "isCreator": false,
		      "isJoined": true,
		    },
		  ],
		]
	`)
	})

	test('return contest details when the user is not signed in', async () => {
		let req = buildReq({
			uid: undefined,
			contestId: 'mockContestId',
		})
		let res = buildRes()

		getContestDetailsWithoutQuestions.mockResolvedValueOnce({
			host_uid: 1002,
		})

		await sendContestDetails(req, res)

		expect(hasUserJoinedTheContest).not.toHaveBeenCalled()

		expect(res.send.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    Object {
		      "host_uid": 1002,
		      "isCreator": false,
		      "isJoined": false,
		    },
		  ],
		]
	`)
	})

	test('handle errors', async () => {
		let req = buildReq()
		let res = buildRes()

		getContestDetailsWithoutQuestions.mockRejectedValueOnce()
		await sendContestDetails(req, res)

		expect(res.status.mock.calls).toMatchInlineSnapshot(`
		Array [
		  Array [
		    500,
		  ],
		]
	`)
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
	})
})
