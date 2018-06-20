const { parseParams, rpx2px } = require('../../lib/utillib');
const pify = require('../../lib/wx-pify');
const { wxapi, canvas, request } = require('../../lib/wxlib');

Page({
	onLoad(params) {
		const { src, target, name, confidence, faceInfo } = parseParams(params);
		wx.showShareMenu({ withShareTicket: true });
		this.draw({ src, target, name, confidence, faceInfo });
	},

	draw({ src, target, name, confidence, faceInfo }) {
		const canvasId = 'result-canvas';
		const ctx = wx.createCanvasContext(canvasId);

		ctx.setFillStyle('#ffffff');
		ctx.fillRect(rpx2px(10), rpx2px(10), rpx2px(610), rpx2px(610));

		// 画两个背景占位
		ctx.setFillStyle('#efefef');
		ctx.fillRect(rpx2px(10), rpx2px(10), rpx2px(300), rpx2px(300));
		ctx.fillRect(rpx2px(300 + 10 + 10), rpx2px(10), rpx2px(300), rpx2px(300));

		// 画两张图片
		return canvas.drawImage({
				page: this,
				canvasId,
				ctx,
				imgUrl: src,
				srcInfo: faceInfo,
				targetInfo: [rpx2px(10), rpx2px(10), rpx2px(300), rpx2px(300)],
				isRemote: false,
				autoDraw: false,
			})
			.then(() => canvas.drawImage({
				page: this,
				canvasId,
				ctx,
				imgUrl: target,
				targetInfo: [rpx2px(310 + 10), rpx2px(10), rpx2px(300), rpx2px(300)],
				isRemote: true,
				autoDraw: false,
			}))
			.then(() => {
				ctx.setFontSize(rpx2px(46));
				ctx.setFillStyle('#FE3EAD');
				ctx.setTextBaseline('middle');
				ctx.setTextAlign('center');

				ctx.fillText(`相似度 ${Math.round(confidence)}%`, rpx2px(300 + 5 + 10), rpx2px(300 + 20 + 30 + 46 / 2));

				ctx.setFontSize(rpx2px(30));
				ctx.setFillStyle('#000000');

				ctx.fillText(`你的上辈子一定是只${name}`, rpx2px(300 + 5 + 10), rpx2px(20 + 300 + 30 + 46 + 20 + 30 / 2));

				ctx.setLineWidth(1);
				ctx.beginPath();
				ctx.moveTo(rpx2px(20 + 10), rpx2px(300 + 10 + 170)); // 起点
				ctx.lineTo(rpx2px(610 + 10 - 20), rpx2px(300 + 10 + 170)); // y轴不变，往右画400像素

				ctx.setStrokeStyle('#f7f7f7');
				ctx.stroke();

				// 画二维码
				ctx.drawImage('/images/share.jpg', rpx2px(20 + 10), rpx2px(10 + 300 + 170 + 15), rpx2px(100), rpx2px(100));

				// 写几个字
				ctx.setFontSize(rpx2px(24));
				ctx.setFillStyle('#999999');
				ctx.setTextAlign('left');

				ctx.fillText('长按保存图片', rpx2px(20 + 100 + 20 + 10), rpx2px(300 + 10 + 170 + 20 + 15 + 24 / 2));
				ctx.fillText('识别参与活动', rpx2px(20 + 100 + 20 + 10), rpx2px(300 + 10 + 170 + 20 + 15 + 24 + 10 + 24 / 2));


				try {
					ctx.setFontSize(rpx2px(20));
					const text = '腾讯云教育与认证中心出品';

					const { width } = ctx.measureText(text);
					ctx.fillText(text, rpx2px(610 + 10 - 10) - width, rpx2px(300 + 10 + 170 + (120 - 20 / 2)));
				} catch (err) {
					// measureText 有兼容性问题，包个try/catch
				}

				ctx.draw();

				return new Promise(resolve => setTimeout(() => resolve(), 200));
			})
			.then(() => wxapi.canvasToTempFilePath('result-canvas'))
			.then(tempFilePath => {
				this.tempFilePath = tempFilePath;
				wx.hideLoading();
			})
			.catch((err) => {
				console.error('Draw canvas fail', err);
				this.showError('图片生成失败');
			});
	},

	saveImage() {
		wxapi.showActionSheet(['保存图片'])
			.then(() => wxapi.saveImageToPhotosAlbum(this.tempFilePath))
			.then(() => wxapi.showSuccess('保存成功'))
			.catch(err => wxapi.showError(err));
	},

	retry() {
		wxapi.chooseImage()
			.then(tempFilePath => {
				return wxapi.redirectTo('/pages/confirm/confirm', {
					imgUrl: tempFilePath,
				});
			})
			.catch(err => wxapi.showError(err));
	},

	onShareAppMessage() {
		return {
			title: '测一测您与哪种萌宠撞脸了？',
			path: '/pages/ranking/ranking',
			imageUrl: this.tempFilePath,
			success: ({ shareTickets }) => {
				if (!shareTickets.length) {
					return;
				}

				pify(wx.getShareInfo)({ shareTicket: shareTickets[0] })
					.then(({ encryptedData, iv }) => request('addUser2Group', {
						encryptedData,
						iv,
					}))
					.then(() => wxapi.showSuccess('分享成功！'))
					.catch(err => wxapi.showError(err));
			},
		}
	},
});