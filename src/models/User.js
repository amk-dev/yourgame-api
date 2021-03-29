import mongoose from 'mongoose'

const transactionsHistory = new mongoose.Schema({
	amount: {
		type: Number,
	},
	event: {
		type: String,
	},
	time: {
		type: Number,
	},
})

const submission = new mongoose.Schema({
	answer: {
		type: String,
		required: true,
	},
	isRight: {
		type: Boolean,
		required: true,
	},
	questionId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'question',
		required: true,
	},
	answeredTime: {
		type: Number,
		required: true,
	},
	timeTaken: {
		type: Number,
		required: true,
	},
	point: {
		type: Number,
		required: true,
	},
})

const joinedContest = new mongoose.Schema({
	contest: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'contest',
	},
	points: {
		type: Number,
		default: 0,
	},
	timeTaken: {
		type: Number,
		required: true,
		default: 0,
	},
	submissions: [submission],
})

const user = new mongoose.Schema({
	uid: {
		type: String,
		required: true,
		unique: true,
	},
	email: {
		type: String,
		default: 0,
		unique: true,
	},
	picture: {
		type: String,
		required: true,
	},
	displayName: {
		type: String,
		required: true,
	},
	winnings: {
		type: Number,
		default: 0,
	},
	bonus: {
		type: Number,
		default: 0,
	},
	isCreator: {
		type: Boolean,
	},
	isReffered: {
		type: Boolean,
	},
	refferedBy: {
		type: String,
	},
	transactionsHistory: [transactionsHistory],
	joinedContests: [joinedContest],
})

user.index(
	{
		uid: 1,
	},
	{
		unique: true,
	}
)

const User = mongoose.model('user', user)

export default User
