import { google } from 'googleapis'

import { processComments } from './../controllers/ManageContest'

import Contest from './../models/Contest'
import { findById } from './../utils/CRED'

let OAuth2 = google.auth.OAuth2

export async function pollComments(
	liveChatId,
	nextPageToken,
	credentials,
	contestId
) {
	let auth = getOAuthClient(credentials)

	// TODO:: check if the contest submissions are stopped.
	getLiveComments(liveChatId, nextPageToken, auth)
		.then(async (result) => {
			// process the comments

			await processComments(result.comments, contestId)

			setTimeout(function() {
				pollComments(
					liveChatId,
					result.nextPageToken,
					credentials,
					contestId
				)
			}, result.pollingTime)
		})
		.catch((error) => console.log(error))
}

export async function getLiveComments(liveChatId, nextPageToken, auth) {
	return new Promise(async function(resolve, reject) {
		try {
			let result = await fetchLiveComments(
				auth,
				liveChatId,
				nextPageToken
			)
			let formattedComments = formatComments(result.comments)

			resolve({
				comments: formattedComments,
				nextPageToken: result.nextPageToken,
				pollingTime: result.pollingTime,
			})
		} catch (e) {
			reject(e)
		}
	})
}

export async function getStartingPageToken(liveChatId, credentials) {
	let oAuth2Client = await getOAuthClient(credentials)
	let service = google.youtube('v3')

	let query = {
		auth: oAuth2Client,
		part: 'snippet,authorDetails',
		liveChatId: liveChatId,
	}

	const commentsResponse = await service.liveChatMessages.list(query)

	return commentsResponse.data.nextPageToken
}

// TODO:: retrive broadCast items only
export async function getLiveChatIdAndStartTime(broadcastId, credentials) {
	try {
		let auth = getOAuthClient(credentials)
		let broadcastDetails = await fetchBroadCastDetails(auth, broadcastId)

		if (broadcastDetails && broadcastDetails.data.items.length > 0) {
			return {
				liveChatId: broadcastDetails.data.items[0].snippet.liveChatId,
				startTime:
					broadcastDetails.data.items[0].snippet.scheduledStartTime,
			}
		} else {
			return false
		}
	} catch (error) {
		console.log(error)
		return false
	}
	// let liveComments = await fetchLiveComments(auth, livechatId)

	// return liveComments
}

export async function getChannelId(credentials) {
	let auth = getOAuthClient(credentials)
	let details = await fetchChannelId(auth)

	if (details.data) {
		let channelId = details.data.items[0].id
		return {
			channelId: channelId,
		}
	} else {
		return {
			channelId: false,
		}
	}
}

function getOAuthClient(credentials) {
	const oAuth2Client = new OAuth2(
		process.env.GOOGLE_OAUTH_CLIENT_ID,
		process.env.GOOGLE_OAUTH_CLIENT_SECRET,
		'http://localhost:8080'
	)

	oAuth2Client.credentials = credentials

	return oAuth2Client
}

async function fetchBroadCastDetails(oAuth2Client, broadcastId) {
	let service = google.youtube('v3')

	// TODO:: handle errors
	try {
		const broadcastDetails = await service.liveBroadcasts.list({
			auth: oAuth2Client,
			part: 'snippet,contentDetails,status',
			id: broadcastId,
		})

		return broadcastDetails
	} catch (e) {
		console.log(e)
		return false
	}
}

export async function fetchLiveComments(
	oAuth2Client,
	liveChatId,
	nextPageToken
) {
	let service = google.youtube('v3')

	let query = {
		auth: oAuth2Client,
		part: 'snippet,authorDetails',
		liveChatId: liveChatId,
	}

	if (nextPageToken) {
		query.pageToken = nextPageToken
	}

	let comments = []
	const commentsResponse = await service.liveChatMessages.list(query)

	if (commentsResponse.data.items.length > 0) {
		comments = commentsResponse.data.items
	}

	return {
		comments,
		nextPageToken: commentsResponse.data.nextPageToken,
		pollingTime: commentsResponse.data.pollingIntervalMillis,
	}
}

function formatComments(comments) {
	let formattedComments = []

	for (let item of comments) {
		let comment = {
			authorChannelId: item.snippet.authorChannelId,
			content: item.snippet.textMessageDetails.messageText,
			publishedTime: item.snippet.publishedAt,
		}

		formattedComments.push(comment)
	}

	return formattedComments
}

async function fetchChannelId(oAuth2Client) {
	let service = google.youtube('v3')

	const channelDetails = await service.channels.list({
		part: 'snippet,contentDetails,statistics',
		mine: true,
		auth: oAuth2Client,
	})

	return channelDetails
}

// insufficient permission - read only
export async function insertMessage(liveChatId, credentials) {
	let oAuth2Client = await getOAuthClient(credentials)

	let service = google.youtube('v3')

	const insertResponse = await service.liveChatMessages.insert({
		auth: oAuth2Client,
		part: 'snippet',
		requestBody: {
			liveChatId: liveChatId,
			type: 'textMessageEvent',
			textMessageDetails: {
				messageText: 'Welcome To YourGame. #thegameison',
			},
		},
	})

	return insertResponse
}
