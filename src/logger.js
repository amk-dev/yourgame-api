import { createLogger, transports } from 'winston'
import logdnaWinston from 'logdna-winston'

const logger = createLogger({})

const errorLogsTransport = new transports.File({
	filename: './logs/error.log',
	level: 'warn',
})

const allLogsTransport = new transports.File({
	filename: './logs/combined.log',
	level: 'http',
})

const options = {
	key: process.env.LOGDNA_INGESTION_KEY,
	app: process.env.APP,
}

logger.add(errorLogsTransport)
logger.add(allLogsTransport)

if (process.env.NODE_ENV == 'production') {
	const logDNATransport = new logdnaWinston(options)
	logger.add(logDNATransport)
}

export default logger
