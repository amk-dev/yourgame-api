import mongoose from 'mongoose'
import { connect } from './../db.js'

// let questions = [
// 	{
// 		name: 'arrow-down',
// 		option_a: 'Left Arrow',
// 		option_b: 'Right Arrow',
// 		option_c: 'Down Arrow',
// 		option_d: 'Up Arrow',
// 		correct_answer: 'option_c',
// 	},
// 	{
// 		name: 'arrow-left',
// 		option_a: 'Left Arrow',
// 		option_b: 'Right Arrow',
// 		option_c: 'Down Arrow',
// 		option_d: 'Up Arrow',
// 		correct_answer: 'option_a',
// 	},
// 	{
// 		name: 'arrow-right',
// 		option_a: 'Left Arrow',
// 		option_b: 'Right Arrow',
// 		option_c: 'Down Arrow',
// 		option_d: 'Up Arrow',
// 		correct_answer: 'option_b',
// 	},
// 	{
// 		name: 'arrow-up',
// 		option_a: 'Left Arrow',
// 		option_b: 'Right Arrow',
// 		option_c: 'Down Arrow',
// 		option_d: 'Up Arrow',
// 		correct_answer: 'option_d',
// 	},
// 	{
// 		name: 'bicycle',
// 		option_a: 'Car',
// 		option_b: 'Bus',
// 		option_c: 'Train',
// 		option_d: 'Bicycle',
// 		correct_answer: 'option_d',
// 	},
// 	{
// 		name: 'birthday-cake',
// 		option_a: 'Cake',
// 		option_b: 'Biscuit',
// 		option_c: 'Mango',
// 		option_d: 'Orange',
// 		correct_answer: 'option_a',
// 	},
// 	{
// 		name: 'camera',
// 		option_a: 'Mobile Phone',
// 		option_b: 'Camera',
// 		option_c: 'Laptop',
// 		option_d: 'Tablet',
// 		correct_answer: 'option_b',
// 	},
// ]

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

// async function insertQuestions(questions) {
// 	await connect()

// 	try {
// 		await Question.insertMany(questions)
// 	} catch (e) {
// 		console.log(e)
// 	}
// }

// insertQuestions(questions)
