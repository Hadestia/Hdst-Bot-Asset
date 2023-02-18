module.exports.config = {
	name: 'admin-reply-message',
	usages: '',
	version: '1.0.3',
	commandCategory: 'hidden',
	description: 'Admin Utilities',
	hasPermssion: 2,
	credits: 'Hadestia'
}

// nothing to do here this is a hidden command
module.exports.run = function ({ api, args, event }) {}

module.exports.handleMessageReply = async function ({ api, event }) {
	
	// return if not replies on bot
	if (event.type === 'message_reply' && !event.body.startsWith(global.config.PREFIX)) {
		
		if (event.messageReply.senderID !== global.botUserID) return;
		if (event.messageReply.body.indexOf('Anonymous Message\n━━━━━━━━━━━━━━━━━━━━') !== -1) return;

		const { messageReply, threadID, messageID, senderID, body } = event;
		const { ADMINBOT } = global.config;
		
		// handle reply from other thread
		if (!ADMINBOT.includes(threadID)) {
			
			const group = (event.isGroup) ? await global.data.threadInfo.get(threadID) : {};
			const sender = await api.getUserInfoV2(senderID);
			
			// contruct message that will send to admin
			const message = global.textFormat('events', 'eventMessageReplyToAdmin', (event.isGroup) ? group.threadName || '<No Data>' : sender.name, sender.name, body, messageReply.body, threadID, messageID);
			
			for (const adminID of ADMINBOT) {
				api.sendMessage(message, adminID);
			}
			return;
			
		} else {
			
			const replyBody = event.messageReply.body;
			// console.log(replyBody);
			if (replyBody.indexOf('𝚝𝚛𝚊𝚌𝚔-𝚒𝚍') === -1) return;
			
			const recipient = replyBody.split('\n');
			// get message id & thread id where the message came from
			const track_id = recipient.pop() || '';
			const thread_id = recipient.pop() || '';
			
			//const recipient = global.logMessageReplyTrack.get(trackId) || {};
			
			
			if (thread_id == '' || track_id == '') {
				return api.sendMessage(`Couldn't get recipient ID`, threadID);
			}
			
			// decide who will handle admin response
			
			//# handle admin reply to bot report
			if (replyBody.indexOf('Admin reply\n━━━━━━━━━━━━━━━━━━━━') !== -1 || replyBody.indexOf('● Bot Report\n━━━━━━━━━━━━━━━━━━━━') !== -1) {
				return api.sendMessage(
					textFormat('events', 'eventAdminReply', body), thread_id,
					(err) => {
						if (err) return global.sendReaction.failed(api, event);
						global.sendReaction.success(api, event);
					},
					track_id
				);
			//# handle admin reply normal
			} else if (replyBody.indexOf('Message reply\n━━━━━━━━━━━━━━━━━━━━') !== -1) {
				return api.sendMessage(
					body, thread_id, (err) => {
					if (err) return global.sendReaction.failed(api, event);
						global.sendReaction.success(api, event);
					},
					track_id
				);
			
			}
		}
	}
}