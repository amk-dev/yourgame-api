import { EventEmitter } from 'events'

const ContestEventEmitter = new EventEmitter()
ContestEventEmitter.setMaxListeners(0)

export default ContestEventEmitter
