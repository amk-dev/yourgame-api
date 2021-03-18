import mongoose from 'mongoose'

const user = new mongoose.Schema({
	uid: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		default: 0,
	},
	picture: {
		type: String,
		required: true,
	},
	displayName: {
		type: String,
		required: true,
	},
	winnings: {
		type: Number,
		default: 0,
	},
	bonus: {
		type: Number,
		default: 0,
	},
})

user.index(
	{
		uid: 1,
	},
	{
		unique: true,
	}
)

const User = mongoose.model('user', user)

export default User
