/**
 * 将小程序暴露的接口Promise化
 * @param api
 * @example
 * pify(wx.request)({ url: 'https://baidu.com' })
 * 		.then(resp => {
 * 			 console.log('接收到响应: ', resp);
 * 		})
 * 	  .catch(err => {
 * 	  	console.error(err);
 * 	  })
 */
module.exports = api => params => new Promise((resolve, reject) => {
	// 不支持的api，默认弹modal提示版本低，然后会reject 一个undefined
	if (!api) {
		wx.showModal({
			title: '提示',
			content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试',
			complete: () => reject(),
			confirmColor: '#006eff',
			showCancel: false,
		});
	} else {
		api.call(wx, { ...params, success: resolve, fail: reject });
	}
});