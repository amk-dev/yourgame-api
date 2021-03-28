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
