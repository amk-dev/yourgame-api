import mongoose from 'mongoose'

const submission = new mongoose.Schema({
	uid: {
		type: String,
		required: true,
	},
	contestId: {
		required: true,
		type: mongoose.Schema.Types.ObjectId,
		ref: 'contest',
	},
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

submission.virtual('user', {
	ref: 'user',
	localField: 'uid',
	foreignField: 'uid',
	justOne: true,
})

const Submission = mongoose.model('submission', submission)

export default Submission
