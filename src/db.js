import mongoose from 'mongoose'

export const connect = () => {
	return mongoose.connect(process.env.MONGO_CONNECTION_STRING, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
	})
}
