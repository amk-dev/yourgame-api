import mongoose from 'mongoose'

const livecomment = new mongoose.Schema({
	authorChannelId: {
		type: String,
		required: true,
	},
	content: {
		type: String,
		required: true,
	},
	contestId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'contest',
	},
	publishedTime: {
		type: Number,
		required: true,
	},
})
