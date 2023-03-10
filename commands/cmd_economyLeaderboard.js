//////// LEADERBOARD: GROUP ECONOMY FEATURE BY HADESTIA ///////

module.exports.config = {
	name: 'leaderboard',
	version: '1.0.1',
	hasPermssion: 0,
	commandCategory: 'economy',
	usages: '[ page ] [-cash | -bank]',
	description: 'View economy group LeaderBoard.',
	credits: 'Hadestia',
	cooldowns: 60,
	aliases: [ 'lb' ],
	envConfig: {
		requiredArgument: 0,
		groupCommandOnly: true
	}
}

module.exports.run = async function ({ api, args, event, returns, textFormat, Prefix, Threads }) {

	const economySystem = require(`${__dirname}/../../json/economySystem.json`);
	const { threadID, messageID, senderID } = event;
	
	try {
		const threadData = await Threads.getData(threadID);
		const economy = threadData.economy;
	
		const currency = threadData.data.default_currency || economySystem.config.default_currency;
		
		const body = args.join(' ').toLowerCase();
		const mode = ((body).match(/-cash|-bank/g)) ? (body).match(/-cash|-bank/g)[0] : '';
		const requestPage = ((body).match(/\d+/g)) ? Math.abs(parseInt((body).match(/\d+/g)[0])) : 1;
		const itemPerPage = 10;
		
		let rankingMsg = '';
		
		const leaderboards = await this.sortLeaderboard(senderID, economy, mode);

		await Threads.setData(threadID, { economy: leaderboards.updatedEconomy });
		
		// get specific list for specific page.
		const totalPages = Math.ceil((leaderboards.sorted).length/itemPerPage);
  	  const page = (requestPage > totalPages) ? 1 : requestPage;
   	 const pageSlice = itemPerPage * page - itemPerPage;
  	  const returnArray = (leaderboards.sorted).slice(pageSlice, pageSlice + itemPerPage);
	
		let index = pageSlice;
	
		for (const data of returnArray) {
			index += 1;
			const number = await global.fancyFont.get(`${index}`, 1);
			rankingMsg += `${number}. ${((data.name).toLowerCase() == 'facebook user') ? data.name : ((data.name).split(' ')).shift()} • ${currency}${(data.total).toLocaleString('en-US')}\n`;
		}
		
		//const fontedThreadName = await global.fancyFont.get(threadData.threadName || '', 1);
		return api.sendMessage(
			textFormat('economy', 'cmdLeaderboard', ((mode == '-cash') ? '𝗖𝗮𝘀𝗵' : (mode == '-bank') ? '𝗕𝗮𝗻𝗸' : ''), rankingMsg, leaderboards.userPosition, page, totalPages),
			threadID,
			messageID
		);
		
	} catch (err) {
		global.sendReaction.failed(api, event);
		global.logger(err, 'error');
		global.logModuleErrorToAdmin(err, __filename, event);
		return api.sendMessage(textFormat('error', 'errCmdExceptionError', err, Prefix), threadID, messageID);
	}
}


module.exports.getOrdinalPosition = function (pos) {
	const numberString = String(pos);
	const endNum = parseInt(numberString[numberString.length - 1]);
	return (endNum == 1) ? 'st' : (endNum == 2) ? 'nd' : (endNum == 3) ? 'rd' : 'th';
}

module.exports.sortLeaderboard = async function (userID, economy, mode = '') {

	const updatedEconomy = {};
	const rankingInfo = [];
	let cIndex = 0;
	let thisUserCurrentRank;
	
	for (const id in economy) {
		if (economy[id]) {
			const name = ((global.data.userName).has(id)) ? (global.data.userName).get(id) : 'Facebook User';
			const total = (mode == '-cash') ? economy[id].hand : (mode == '-bank') ? economy[id].bank : (economy[id].bank + economy[id].hand) ;
			rankingInfo.push({ id, name, total });
			// use to remove left user and update the economy
			updatedEconomy[String(id)] = economy[id];
		}
	}
	
	// sort leaderboard top-lowest
	rankingInfo.sort((a, b) => {
		return (a.total < b.total) ? 1 : -1;
	});
	
	// basically track requester current leaderboard position
	for (const data of rankingInfo) {
		cIndex += 1
		if (data.id == userID) {
			const ordinals = this.getOrdinalPosition(cIndex);
			thisUserCurrentRank = await global.fancyFont.get(`${cIndex}${ordinals}`, 2);
		}
	}
	
	return { sorted: rankingInfo, updatedEconomy , userPosition: (thisUserCurrentRank) ? thisUserCurrentRank : 'untracked' };
}