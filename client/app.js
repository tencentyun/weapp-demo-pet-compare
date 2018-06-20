const config = require('./config');
const { login, request } = require('./lib/wxlib');
const pify = require('./lib/wx-pify');

App({
	onShow({ shareTicket, scene } = {}) {
		console.log({ scene, shareTicket });

		if (shareTicket && String(scene) === '1044') {
			this.shareInfoPromise = this.getShareInfo(shareTicket);
		}
	},

	getShareInfo(shareTicket) {
		return login.login()
			.then(() => pify(wx.getShareInfo)({ shareTicket }))
			.then(({ encryptedData, iv }) => request('getGroupRanking', { encryptedData, iv }));
	},
});