import mongoose from 'mongoose'

const contest = new mongoose.Schema({
	host_uid: {
		type: String,
		required: true,
	},
	host_picture: {
		type: String,
		required: true,
	},
	host_display_name: {
		type: String,
		required: true,
	},
	youtubeVideoId: {
		type: String,
		required: true,
	},
	startTime: {
		type: Number,
		required: true,
	},
	status: {
		type: String,
		required: true,
	},
	questions: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'question',
		},
	],
	currentQuestion: {
		type: Number,
	},
	currentQuestionReleaseTime: {
		type: Number,
	},
	currentQuestionStatus: {
		type: String,
	},
})

const Contest = mongoose.model('contest', contest)

export default Contest
