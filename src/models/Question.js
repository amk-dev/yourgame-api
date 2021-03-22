import mongoose from 'mongoose'

const question = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	option_a: {
		type: String,
		required: true,
	},
	option_b: {
		type: String,
		required: true,
	},
	option_c: {
		type: String,
		required: true,
	},
	option_d: {
		type: String,
		required: true,
	},
	correct_answer: {
		type: String,
		required: true,
	},
})

const Question = mongoose.model('question', question)

export default Question
