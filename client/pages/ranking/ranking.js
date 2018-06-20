const { wxapi } = require('../../lib/wxlib');

Page({
	data: {
		list: [],
		currentIndex: -1,
	},
	onLoad() {
		console.log('ranking onload');
		if (getApp().shareInfoPromise) {
			wx.showLoading('加载中');

			getApp().shareInfoPromise
				.then(({ list, currentId }) => {
					wx.hideLoading();

					let currentIndex = -1;

					if (currentId) {
						list.some(({ id }, index) => {
							if (id === currentId) {
								currentIndex = index;
								return true;
							}
						})
					}

					this.setData({
						list,
						currentIndex,
					});
				})
				.catch((err) => {
					wxapi.showError(err);
				})
		} else {
			wxapi.redirectTo('/pages/home/home');
		}
	},

	tryAgain() {
		wxapi.redirectTo('/pages/home/home');
	}
});