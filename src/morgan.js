import morgan from 'morgan'
import logger from './logger.js'

morgan.token('uid', (req) => (req.uid ? req.uid : 'not-authorized'))

const morganStreamOptions = { write: (message) => logger.http(message) }
const morganFormatString =
	':method :url :status :res[content-length] :response-time ms :date[clf] :uid'

const morganHandler = morgan(morganFormatString, {
	stream: morganStreamOptions,
})

export default morganHandler
