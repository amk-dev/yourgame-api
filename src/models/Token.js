import mongoose from 'mongoose'

const token = new mongoose.Schema({
	access_token: {
		type: String,
		required: true,
	},
	refresh_token: {
		type: String,
		required: true,
	},
	scope: {
		type: String,
		required: true,
	},
	token_type: {
		type: String,
		required: true,
	},
	id_token: {
		type: String,
		required: true,
	},
	expiry_date: {
		type: Number,
		required: true,
	},
	uid: {
		type: String,
		required: true,
	},
})

const Token = mongoose.model('token', token)

export default Token
