const { login, wxapi } = require('../../lib/wxlib');

Page({
	addImage({ detail }) {
		login.setUserInfo(detail)
			.catch(() => wx.showToast({
				title: '获取用户信息失败',
				icon: 'none',
			}))
			.then(() => login.login())
			.then(() => this.chooseImage())
			.catch(err => wxapi.showError(err));
	},

	chooseImage() {
		return wxapi.chooseImage()
			.then(tempFilePath => wxapi.redirectTo('/pages/confirm/confirm', {
				imgUrl: tempFilePath,
			}))
			.catch(err => wxapi.showError(err));
	}
});