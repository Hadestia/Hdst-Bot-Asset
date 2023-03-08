module.exports.config = {
	name: 'memberJoin',
	eventType: ['log:subscribe'],
	version: '1.0.0',
	credits: 'Hadestia',
	description: 'Sent a welcome message to new member.',
	dependencies: {
		'gif-encoder-2': '',
		'fs-extra': '',
		'canvas': '',
		'axios': '',
		'path': '',
		'jimp': ''
	}
};

module.exports.run = async function({ api, event, Threads }) {

	//const { Readable } = require('stream');
	const { threadID, logMessageData } = event;
	const addedMember = logMessageData.addedParticipants;
	// do not send a notif if bot was part of an added members
	if (addedMember.some(i => i.userFbId == global.botUserID)) return;
	
	//if (threadID !== '5742405099128283') return;
	
	const CACHE = `${global.client.mainPath}/cache`;
	
	// thread info
	const { imageSrc, threadName, participantIDs } = await api.getThreadInfo(threadID);
	// clean threadName
	const thread_name = removeNonASCII((threadName || 'This Group').normalize('NFKD'));
	
	const canvas = require('canvas');
	const GIF = require(`${__dirname}/../../utils/editGif.js`);
	const gifEncoder = require('gif-encoder-2');
	const axios = require('axios');
	const path = require('path');
	const fs = require('fs-extra');

	
	if (addedMember.length > 1) {
		try {
			const mentions = [], names = [];
			for (const user of addedMember) {
				const splitName = (removeNonASCII((user.fullName).normalize('NFKD'))).split(' ');
				const shortName = (splitName.length > 2) ? `${splitName[0]} ${splitName[1]}` : user.fullName;
				names.push(shortName);
				mentions.push({ tag: shortName, id : user.userFbId });
			}
			
			const baseGifPath = path.join(CACHE, 'keep', 'gifs/bg_city.gif');
			const final_welcome_members_path = path.join(CACHE, 'keep', 'welcome_members.gif');

			if (!fs.existsSync(final_welcome_members_path)) {
			
				const topWelcomImgPath = path.join(CACHE, 'keep', 'thumb-top_welcomeMem.png');
				const topWelcomeImg = await canvas.loadImage(topWelcomImgPath);
			
				const result = GIF.edit(
					baseGifPath,
					{
						quality: 5,
						canvasW: topWelcomeImg.width,
						canvasH: topWelcomeImg.height,
						gifCropAtX: 0,
						gifCropAtY: 60,
						gifGetPartW: topWelcomeImg.width,
						giftGetPartH: topWelcomeImg.height
					},
					(ctx, width, height, totalFrames, currentFrame) => {
						ctx.drawImage(topWelcomeImg, 0, 0);
					}
				);		
				fs.writeFileSync(final_welcome_members_path, result);
			}
		
		 
			api.sendMessage(
				{
					body: global.textFormat('events', 'eventMembersJoined', await global.fancyFont.get(thread_name, 1), await names.join(', '), await global.fancyFont.get(`${participantIDs.length}`, 1)),
					mentions,
					attachment: fs.createReadStream(final_welcome_members_path)
				},
				threadID,
				global.autoUnsend
			);
		} catch (err) {
			//global.logger(err, 'error');
			console.log(err);
			global.logModuleErrorToAdmin(err, __filename, event);
		}
	// if single member
	} else {
		try {
			const truncated_user_pos = truncByChar(`${getOrdinalPosition(participantIDs.length)} member of ${thread_name}`, 26);
			
			const user = addedMember[0];
			const user_name = shortenUserName(user.fullName, 16);
			
			const final_welcome_gif_path = path.join(CACHE, `joinNoti_${user.userFbId}_@${threadID}.gif`);
			
			// get user avatar && group image
			const avatar = (await axios.get(
				`https://graph.facebook.com/${user.userFbId}/picture?height=1500&width=1500&access_token=${process.env.FB_ACCESS_TOKEN}`,
				{ responseType: 'arraybuffer' }
			)).data;
			// some of group don't have group photo
			let groupAvatar;
			if (imageSrc) {
				const groupPhoto = (await axios.get(imageSrc, { responseType: 'arraybuffer' })).data
				const circle_groupPhoto = await convertToCircleImg(groupPhoto);
				groupAvatar = await canvas.loadImage(circle_groupPhoto);
			}
			
			const circle_userAva = await convertToCircleImg(avatar);
			
			const userAvatar = await canvas.loadImage(circle_userAva);
			//const groupAvatar = await canvas.loadImage(groupPath);
			
			// PREPARE OVERLAYS
			const topImg = await canvas.loadImage(path.resolve(CACHE, 'keep', 'thumb-top_styleUserJoin.png'));

			const oilrigFrames = fs.readdirSync(path.join(CACHE, 'keep/bg_oilrig')).filter(frame => frame.endsWith('.gif'));
			
			// PREPARE FONTS
			canvas.registerFont(path.join(CACHE, 'keep/fonts', 'BungeeInline-Regular.ttf'), { family: 'BungeeInline-Regular' });
			canvas.registerFont(path.join(CACHE, 'keep/fonts', 'Bevan-Regular.ttf'), { family: 'Bevan-Regular' });
			
			// START GIF CREATION
			const encode = new gifEncoder(topImg.width, topImg.height);
			encode.start()
			encode.setDelay(500);
			encode.setRepeat(0);
			encode.setQuality(10);
			encode.setFrameRate(60);
			
			for (const frame of oilrigFrames) {
			
				const frameImg = await canvas.loadImage(CACHE + '/keep/bg_oilrig/' + frame);
				const mCanvas = canvas.createCanvas(topImg.width, topImg.height);
				const ctx = mCanvas.getContext('2d');
				// ## Images
				ctx.drawImage(frameImg, 0, 0, mCanvas.width, mCanvas.height);
				ctx.drawImage(topImg, 0, 0, mCanvas.width, mCanvas.height);
			
				// avatars
				ctx.drawImage(userAvatar, 49, 74, 90, 90);
				(groupAvatar) ? ctx.drawImage(groupAvatar, (mCanvas.width - (55 + 10)), 5, 55, 55) : '';
				
				// ## Texts
				ctx.fillStyle = '#ffffff';
				ctx.font = '25px BungeeInline-Regular';
				// name
				ctx.fillText(user_name, 168, 115);
				// lower text
				ctx.font = '15px Bevan-Regular';
				ctx.fillText(truncated_user_pos, 168, 140);
	
				encode.addFrame(ctx);
			}
			encode.finish()
			fs.writeFileSync(final_welcome_gif_path, encode.out.getData());
		
			api.sendMessage(
				{
					body: global.textFormat('events', 'eventUserJoined', user.fullName, getOrdinalPosition(participantIDs.length)),
					mentions: [{ tag: user.fullName, id: user.userFbId }],
					attachment: fs.createReadStream(final_welcome_gif_path)
				},
				threadID,
				(e, info) => {
					fs.unlinkSync(final_welcome_gif_path);
					global.autoUnsend(e, info);
				}
			)
		
		} catch (err) {
			console.log(err)
			global.logModuleErrorToAdmin(err, __filename, event);
		}
	}
}

// just make the image round
async function convertToCircleImg(img) {
	const jimp = require('jimp');
	img = await jimp.read(img);
	img.circle();
	return await img.getBufferAsync('image/png');
}

// remove non ascii characters on a string
function removeNonASCII(str) {
	return str.replace(/[^\x20-\x7E]/g, '');
}

// truncate string into specific number of words
function truncByWords(str, no_words) {
	const splited = str.split(' ');
    return (splited.length > no_words) ? `${splited.splice(0,no_words).join(' ')}...`: str;
}

function truncByChar(str, n) {
	return (str.length > n) ? str.slice(0, n-1) + '...' : str;
}

function shortenUserName(name, maxchar) {
	const participant_name = ((name).normalize('NFKD')).split(' ');
	let shorten_user_name = (participant_name.length > 3) ? `${participant_name[0]} ${(participant_name).pop()}` : name;
	
	let first = (shorten_user_name.split(' '))[0];
	let last = (shorten_user_name.split(' ')).pop();
	return (shorten_user_name > maxchar) ? `${first} ${last[0]}.` : shorten_user_name;
}

function getOrdinalPosition(pos) {
	let order = '';
	const numberString = String(pos);
	const endNum = parseInt(numberString[numberString.length - 1]);
	order = (endNum == 1) ? 'st' : (endNum == 2) ? 'nd' : (endNum == 3) ? 'rd' : 'th';
	return `${pos}${order}`;
}