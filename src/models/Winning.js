import mongoose from 'mongoose'

const winning = new mongoose.Schema({
	uid: {
		type: String,
		required: true,
	},
	contestId: {
		required: true,
		type: mongoose.Schema.Types.ObjectId,
		ref: 'contest',
	},
	amount: {
		required: true,
		type: Number,
	},
})

winning.index(
	{
		contestId: 1,
		uid: 1,
	},
	{
		unique: true,
	}
)

const Winning = mongoose.model('winning', winning)

export default Winning
