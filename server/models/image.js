const querystring = require('querystring');
const crypto = require('crypto');
const { qcloud: qcloudConfig } = require('../config');
const localModel = require('./local');
const cos = require('../libs/cos');

const request = require('request');

const {
	appId,
	secretId,
	secretKey,
	cos: {
		bucket,
		region,
	},
} = qcloudConfig;

/**
 * 腾讯云智能图像的Api签名
 *
 * @doc https://cloud.tencent.com/document/product/867/17719
 * @return {String}
 */
function sign() {
	const nowUnix = Math.round(Date.now() / 1000);

	const params = {
		a: appId,
		b: bucket,
		k: secretId,
		e: nowUnix + 30 * 60,
		t: nowUnix,
		u: 0,
		f: '',
	};

	const srcStr = querystring.stringify(params);
	const hmac = crypto.createHmac('sha1', secretKey);
	const sha1Buffer = hmac.update(srcStr).digest();

	const srcStrBuffer = new Buffer(srcStr);

	return Buffer.concat([sha1Buffer, srcStrBuffer]).toString('base64');
}

function doRequest(url, body, opts = {}) {
	return new Promise((resolve, reject) => {
		const signature = sign();

		const options = Object.assign({
			url: url,
			method: 'POST',
			json: true,
			headers: {
				authorization: signature,
			},
			body: Object.assign({ appid: appId }, body),
		}, opts);

		const startTime = Date.now();

		console.log(`[http-start] => ${JSON.stringify({ options })}`);

		request(options, (error, resp, body) => {
			console.log(`[http-end] => ${JSON.stringify({
				options,
				error,
				statusCode: resp.statusCode,
				body,
				timeCost: Date.now() - startTime
			})}`);

			if (error) {
				return reject(error);
			}

			if (resp.statusCode !== 200) {
				reject({ code: resp.statusCode });
			} else {
				resolve(body);
			}
		});
	});
}

module.exports = {
	/**
	 * 人脸识别
	 * @see https://cloud.tencent.com/document/product/641/12420
	 */
	async compare(url) {
		const resp = await doRequest('http://recognition.image.myqcloud.com/face/identify', {
			group_id: 'resources',
			url,
		});

		const { code, data } = resp;

		if (code) {
			throw resp;
		}

		const { candidates } = data;

		if (!candidates || !candidates.length) {
			throw { code: -1, msg: '无法匹配到相似的宠物' };
		}

		const [{ person_id, confidence }] = candidates;

		// 匹配出人脸后，查询与之关联的宠物的信息
		const personInfo = await localModel.getPerson({ personId: person_id });

		return Object.assign({ confidence }, personInfo)
	},

	/**
	 * 鉴黄
	 * @param imgUrl
	 * @see https://cloud.tencent.com/document/product/641/12422
	 */
	async pornDetect(imgUrl) {
		const { result_list = [] } = await doRequest('http://service.image.myqcloud.com/detection/porn_detect', {
			url_list: [imgUrl]
		});

		let isValidImage = false;

		result_list.some(item => {
			if (item.url === imgUrl) {

				isValidImage = (item.data || {}).result === 0;

				return true;
			}
		});

		return isValidImage;
	},

	/**
	 * 人脸检测，用于定位人脸位于图片的具体位置
	 *
	 * @doc https://cloud.tencent.com/document/product/641/12415
	 * @param imgUrl
	 * @return {Promise.<*>}
	 */
	async faceDetect(imgUrl) {
		const resp = await doRequest('http://recognition.image.myqcloud.com/face/detect', {
			url: imgUrl,
			mode: 1,
		});

		const { data, code } = resp;

		if (code !== 0) {
			throw resp;
		}

		return data;
	},

	/**
	 * 先去腾讯云智能图像添加个体/人脸
	 *
	 * 然后存下人脸与宠物图片的对应关系
	 *
	 * @param personId
	 * @param personName
	 * @param groupId
	 * @param groupIds
	 * @param url
	 * @param animalImgUrl
	 * @return {Promise.<void>}
	 * @doc https://cloud.tencent.com/document/product/641/12417
	 */
	async addPerson({ personId, personName, groupId, groupIds, url, animalImgUrl }) {
		if (typeof groupId === 'string' && !groupIds) {
			groupIds = [groupId];
		}

		const resp = await doRequest('http://recognition.image.myqcloud.com/face/newperson', {
			group_ids: groupIds,
			person_id: personId,
			url,
			person_name: personName,
		});

		if (resp.code === 0) {
			await localModel.savePerson({
				personId,
				personName,
				url: animalImgUrl,
			});
		} else {
			throw resp;
		}
	},
};