/**
 * 请求微信接口模块
 */

const { weapp: weappConfig } = require('../config');
const request = require('request');

const {
	appId,
	appSecret,
} = weappConfig;

module.exports = {
	async jscode2session(code) {
		return new Promise((resolve, reject) => {
			request({
				url: `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`,
				json: true,
			}, (error, resp, body) => {
				if (error) {
					return reject(error);
				}

				if (resp.statusCode !== 200) {
					reject({ code: resp.statusCode });
				} else {
					resolve(body);
				}
			})
		});
	},
};