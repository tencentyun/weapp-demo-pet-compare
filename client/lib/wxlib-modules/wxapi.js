const pify = require('../wx-pify');
const config = require('../../config');
const utillib = require('../utillib');

const codeReg = /\((\d+)\).+/;
const isUserReject = error => /cancel/.test(error.errMsg);
const isNoAuth = error => error.errMsg.indexOf('auth deny') > -1;

const operatingReject = (error) => {
	// 用户主动拒绝，不做错误处理
	if (isUserReject(error)) {
		return Promise.reject();
	}
	return Promise.reject(error);
};

module.exports = {
	request(params = {}) {
		return pify(wx.request)(params);
	},

	uploadFile(params = {}) {
		return pify(wx.uploadFile)(params);
	},

	setStorage(key, value) {
		return pify(wx.setStorage)({ key, data: value });
	},

	getStorage(key) {
		return pify(wx.getStorage)({ key })
			.then(({ data }) => data)
			.catch(() => null);
	},

	removeStorage(key) {
		return pify(wx.removeStorage)({ key });
	},

	checkSession() {
		return pify(wx.checkSession)();
	},

	login() {
		return pify(wx.login)()
			.then(({ code }) => code);
	},

	/**
	 * 获取错误信息
	 * @param {Object|String} err
	 * @param defaultMsg
	 * @return {*}
	 */
	getErrorMsg(err, defaultMsg = '') {
		if (!err) return;

		let errorMsg = '';

		if (typeof err === 'string') return err;

		if (err && typeof err.errMsg === 'string' && /cancel/.test(err.errMsg)) {
			return '';
		}

		if (typeof err === 'object' && 'code' in err) {
			if (err.msg) {
				errorMsg = `${err.msg}`;
			} else {
				errorMsg = '网络繁忙';
			}

			if (!codeReg.test(errorMsg)) {
				errorMsg += `(${err.code})`;
			}
		} else {
			errorMsg = defaultMsg || '连接服务器失败，请稍后再试';
		}

		return errorMsg;
	},

	showSuccess(message) {
		wx.showToast({
			title: message,
			icon: 'none',
		});
	},

	showError(err) {
		wx.hideToast();
		let msg = '';
		if (err) {
			msg = this.getErrorMsg(err);
			if (msg) {
				console.warn('showError', err);
				wx.showToast({
					title: msg,
					icon: 'none',
				});
			}
		}
	},

	chooseImage(opts = {}) {
		return pify(wx.chooseImage)(Object.assign({
			count: 1,
			sizeType: ['original', 'compressed'],
		}, opts))
			.then(({ tempFilePaths }) => tempFilePaths[0]);
	},

	redirectTo(url, params = {}) {
		url = utillib.appendParams(url, params);

		return pify(wx.redirectTo)({ url });
	},

	downloadFile(url) {
		const options = { url, header: {} };

		const uriArr = url.split('.');
		const extensions = uriArr[uriArr.length - 1].toLowerCase();

		switch (extensions) {
			case 'jpg':
			case 'jpeg':
				options.header['Content-Type'] = `image/${extensions}`;
				break;
		}

		return pify(wx.downloadFile)(options)
			.then(({ tempFilePath, statusCode }) => {
				if (statusCode === 200) {
					return tempFilePath;
				} else {
					return Promise.reject({ code: statusCode, msg: '获取网络图片失败' });
				}
			});
	},

	getImageInfo(src) {
		return pify(wx.getImageInfo)({ src })
			.then(({ height, width, orientation, type }) => {
				return { height, width, orientation, type };
			})
			.catch((err) => {
				operatingReject(err)
			});
	},

	canvasToTempFilePath(canvasId) {
		return pify(wx.canvasToTempFilePath)({ canvasId })
			.then(({ tempFilePath }) => tempFilePath);
	},

	/**
	 * @see https://mp.weixin.qq.com/debug/wxadoc/dev/api/api-react.html#wxshowactionsheetobject
	 * @param {Array} itemList
	 * @param {Object} opts
	 */
	showActionSheet(itemList = [], opts = {}) {
		return pify(wx.showActionSheet)({ itemList, ...opts })
			.then(({ tapIndex }) => tapIndex)
			.catch(err => operatingReject(err));
	},

	showModal(opts = {}) {
		wx.hideToast();

		return pify(wx.showModal)(Object.assign({
			confirmColor: '#006eff',
			cancelColor: '#888',
		}, opts))
			.then(({ confirm }) => !!confirm)
			.catch(() => false);
	},

	saveImageToPhotosAlbum(filePath) {
		return pify(wx.saveImageToPhotosAlbum)({ filePath })
			.catch(err => {
				console.error('err', err);
				if (isNoAuth(err)) {
					return this.showModal({
						title: '微信授权失败',
						content: '您需要授权才可保存图片',
						confirmText: '前往设置',
					}).then(isConfirm => {
						if (isConfirm) {
							return pify(wx.openSetting)()
								.then(({ authSetting }) => {
									if (authSetting && authSetting['scope.writePhotosAlbum']) {
										return this.saveImageToPhotosAlbum(filePath);
									}
								})
						} else {
							return Promise.reject();
						}
					});
				} else {
					return operatingReject(err);
				}
			});
	},
};