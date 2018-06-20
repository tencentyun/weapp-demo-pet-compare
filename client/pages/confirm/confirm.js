const utillib = require('../../lib/utillib');
const { request, login, wxapi, canvas } = require('../../lib/wxlib');

Page({
	onLoad(params) {
		const { imgUrl } = utillib.parseParams(params);
		if (imgUrl) {
			this.imgUrl = imgUrl;
			return this.draw();
		} else {
			wxapi.redirectTo('/pages/home/home');
		}
	},

	draw() {
		const ctx = wx.createCanvasContext('canvas');

		const border = utillib.rpx2px(400);

		ctx.setFillStyle('#efefef');
		ctx.fillRect(0, 0, border, border);

		return canvas.drawImage({
			ctx,
			targetInfo: {
				width: border,
				height: border,
			},
			imgUrl: this.imgUrl,
			saveAfterDraw: true,
		});
	},

	confirm() {
		wx.showLoading({
			title: '处理中',
			mask: true
		});

		const userInfo = login.getUserInfo();

		return request('compare', { userInfo }, {
			filePath: this.imgUrl,
			name: 'image',
			isUploadFile: true,
		})
			.then(({ personName, url, confidence, faceInfo }) => {

				wxapi.redirectTo('/pages/result/result', {
					src: this.imgUrl,
					target: url,
					name: personName,
					confidence,
					faceInfo,
				});

				wx.hideLoading();
			})
			.catch(err => wxapi.showError(err));
	},

	reset() {
		return wxapi.chooseImage()
			.then(tempFilePath => {
				this.imgUrl = tempFilePath;
				return this.draw();
			})
			.catch(err => wxapi.showError(err));
	}
});