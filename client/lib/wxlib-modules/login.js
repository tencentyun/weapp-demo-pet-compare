const wxapi = require('./wxapi');
const config = require('../../config');
const request = require('./request');

let _userInfo;

module.exports = {
	getSessionId() {
		return wxapi.getStorage(config.sessionIdKey);
	},

	login() {
		return this.checkLogin()
			.then(hasLogin => {
				if (!hasLogin) {
					return this.doLogin();
				}
			});
	},

	doLogin() {
		return wxapi.login()
			.then(code => request('login', { code }));
	},

	/**
	 * 检查当前登录态是否仍有效，有效返回true，无效返回false
	 * @return {Promise.<Boolean>}
	 */
	checkLogin() {
		return Promise.all([
				wxapi.getStorage(config.sessionIdKey).then(sessionId => {
					if (!sessionId) {
						return Promise.reject({ code: 'NOT-LOGIN' });
					}
				}),
				wxapi.checkSession(),
			])
			.then(() => true)
			.catch((err) => {
				console.warn('CheckLogin fail', err);
				this.logout();
				return false;
			});
	},

	logout() {
		return wxapi.removeStorage(config.sessionIdKey);
	},

	setUserInfo({ userInfo, errMsg }) {
		if (errMsg.indexOf('auth deny') > -1) {
			return Promise.reject('获取用户信息失败');
		}

		_userInfo = userInfo;

		return Promise.resolve();
	},

	getUserInfo() {
		return _userInfo;
	},
};