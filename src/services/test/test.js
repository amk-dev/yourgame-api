// import { fetchLiveComments, getOAuthClient } from '../YoutubeAPI'

// const userToken = await Token.findOne({ uid: 'xUlFqahNlDUjCVheDXg7xPLrxRE2' })
// 	.lean()
// 	.exec()

// if (userToken) {
// 	let {
// 		refresh_token,
// 		expiry_date,
// 		access_token,
// 		token_type,
// 		id_token,
// 		scope,
// 	} = userToken

// 	let youtube_credentials = {
// 		refresh_token,
// 		expiry_date,
// 		access_token,
// 		token_type,
// 		id_token,
// 		scope,
//     }

//     let client = getOAuthClient( youtube_credentials )

//     fetchLiveComments()

// } else {
// 	console.log('Not Available')
// }
