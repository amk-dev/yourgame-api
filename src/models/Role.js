import mongoose, { mongo } from 'mongoose'

const role = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
})

const Role = mongoose.model('role', role)

export default Role
