import mongoose from 'mongoose'

const game = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	description: {
		type: String,
		required: true,
	},
})

const Game = mongoose.model('game', game)

export default Game
