/**
 * 对腾讯云cos node sdk做一层简单封装
 */

const fs = require('fs');
const streamLength = require('stream-length');
const COS = require('cos-nodejs-sdk-v5');
const { qcloud: qcloudConfig } = require('../config');

const {
	appId,
	secretId,
	secretKey,
	cos: {
		bucket,
		region,
	},
} = qcloudConfig;

// 实例化cos sdk
const cos = new COS({
	AppId: appId,
	SecretId: secretId,
	SecretKey: secretKey,
});

// 获取文件（流）内容的长度（单位：字节）
function getSourceContentLength(source) {
	if (typeof source === 'string') {
		source = fs.createReadStream(source);
	}

	return streamLength(source, {
		lengthRetrievers: [
			// support `multiparty` parsed stream
			(stream, callback) => callback(stream.byteCount || null),
		],
	});
}

function signObject(target) {
	return new Promise((resolve, reject) => {
		try {
			cos.getObjectUrl({
				Key: target,
				Bucket: bucket,
				Region: region,
				Expires: 12 * 60 * 60,
			}, (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data.Url);
				}
			});
		} catch (err) {
			reject(err);
		}
	});
}

module.exports = {
	cos,
	/**
	 * 上传图片到cos，返回带鉴权地址的url
	 * @param source
	 * @param target
	 * @param opts
	 * @return {Promise.<void>}
	 */
	async upload(source, target, opts = {}) {
		let params = Object.assign({
			Bucket: bucket,
			Region: region,
			Body: source,
			Key: target,
		}, opts);

		// Convert `buffer` to `readable stream`
		if (Buffer.isBuffer(source)) {
			params.Body = fs.createReadStream(source);
		}

		await new Promise(async (resolve, reject) => {
			if (!params.ContentLength) {
				params.ContentLength = await getSourceContentLength(source);
			}

			cos.putObject(params, (err, result) => {
				if (err) {
					reject(err)
				} else {
					resolve(result);
				}
			})
		});

		return signObject(target);
	},
	/**
	 * 删除cos对象
	 * @param target
	 * @param opts
	 * @return {Promise}
	 */
	async delete(target, opts = {}) {
		const params = Object.assign({
			Bucket: bucket,
			Region: region,
			Key: target,
		}, opts);

		return new Promise((resolve, reject) => {
			cos.deleteObject(params, function (err, data) {
				if (err) {
					return reject(err);
				}

				resolve(data);
			});
		})
	},
};