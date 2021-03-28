/* eslint-disable */
let User = {
	findOne: jest.fn(() => User),
	select: jest.fn(() => User),
	exec: jest.fn(() => User),
	save: jest.fn(() => User),
	lean: jest.fn(() => User),
}

module.exports = User
