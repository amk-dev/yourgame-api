import mongoose from 'mongoose'

export const connect = () => {
	return mongoose.connect('mongodb://localhost:27017/yourgame', {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
	})
}