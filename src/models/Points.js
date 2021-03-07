import mongoose from 'mongoose'

const point = new mongoose.Schema({
	uid: {
		type: String,
		required: true,
	},
	contestId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'contest',
	},
	points: {
		type: Number,
		required: true,
	},
})

point.virtual('user', {
	ref: 'User',
	localField: 'uid',
	foreignField: 'uid',
	justOne: true,
})

const Point = mongoose.model('point', point)

export default Point
