let Contest = {
	findOne: jest.fn(() => Contest),
	select: jest.fn(() => Contest),
	exec: jest.fn(() => Contest),
	save: jest.fn(() => Contest),
	lean: jest.fn(() => Contest),
}

module.exports = Contest
