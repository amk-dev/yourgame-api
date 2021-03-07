import path from 'path'
import * as admin from 'firebase-admin'

const firebaseCredentials = path.join(
	__dirname,
	'./yourgame-firebase-credentials.json'
)

admin.initializeApp({
	credential: admin.credential.cert(firebaseCredentials),
})

export default admin
