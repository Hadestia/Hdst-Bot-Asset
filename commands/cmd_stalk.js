module.exports.config = {
	name: 'stalk',
	version: '1.0.8',
	hasPermssion: 0,
	credits: 'Hadestia',
	commandCategory: 'utilities',
	description: 'get user info of yourself or using uid / by mentioning / or replied message',
	usages: '[ (reply) | uid | (mention) ]',
	cooldowns: 300
};

module.exports.run = async function ({ api, event, args, utils, textFormat }) {
	
	const axios = require('axios');
	const fs = require('fs-extra');
	const request = require('request');
	
	if (event.body.indexOf('https') !== -1 || event.body.indexOf('//') !== -1) {
		global.sendReaction.failed(api, event);
		return 'invalid_usage';
	}
	global.sendReaction.inprocess(api, event);
	try {
		
		let { threadID, senderID, messageID } = event;
		let id;
		
		if (args.join().indexOf('@') !== -1) {
			
			const mentKeys = Object.keys(event.mentions);
			if (mentKeys.length == 0) {
				return api.sendMessage('Why should i stalk my self?', threadID, mentionID);
			}
			id = Object.keys(event.mentions)
			
		} else {
			
			id = args[0] || event.senderID;
			
		}
		
		if (event.type == 'message_reply') {
			
			id = event.messageReply.senderID
			
		}
		
		const res = await api.getUserInfoV2(id);
		const n_a = '𝘯𝘰 𝘥𝘢𝘵𝘢';
		
		var gender = (res.gender != 0) ? res.gender : n_a;
		var is_birthday = res.isBirthday == true ? 'Yes' : 'No';
		var usern = (res.username) ? res.username : id;
		//var love = res.relationship_status == 'Không Có Dữ Liệu' ? n_a : res.relationship_status;
		//var location = res.location == 'Không Có Dữ Liệu' ? n_a : res.location.name;
		//var hometown = res.hometown == 'Không Có Dữ Liệu' ? n_a : res.hometown.name;
		//var follow = res.follow == 'Không Có Dữ Liệu' ? n_a : res.follow;
		//var rs = res.love == 'Không Có Dữ Liệu' ? n_a : res.love.name;

		const path = `${__dirname}/../../cache/stalkImg.png`;
		
		const callback = function () {
			
			return api.sendMessage(
				{
					body: textFormat('cmd', 'cmdStalkFormat', res.name, usern, gender, is_birthday),
					attachment: fs.createReadStream(path)
				},
				event.threadID,
				(e, info) => {
					global.sendReaction.success(api, event);
					try { fs.unlinkSync(path) } catch (e) {}
					global.autoUnsend(e, info, 300);
				},
				event.messageID
			)
			
		};
		
		return request(encodeURI(`https://graph.facebook.com/${id}/picture?width=512&height=512&access_token=${process.env.FB_ACCESS_TOKEN}`)).pipe(fs.createWriteStream(path)).on('close', callback);
		
	} catch (err) {
		global.sendReaction.failed(api, event);
		api.sendMessage(textFormat('error', 'errCmdExceptionError', err, global.config.PREFIX), theadID, messageID);
		return console.log(err);
	}
}