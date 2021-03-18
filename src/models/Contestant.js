import mongoose from 'mongoose'

const contestant = new mongoose.Schema({
	uid: {
		type: String,
		required: true,
	},
	contest: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'contest',
	},
	points: {
		type: Number,
		required: true,
	},
})

contestant.index(
	{
		contest: 1,
		uid: 1,
	},
	{
		unique: true,
	}
)

const Contestant = mongoose.model('contestant', contestant)

export default Contestant
