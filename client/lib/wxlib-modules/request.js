const wxapi = require('./wxapi');
const utillib = require('../utillib');
const config = require('../../config');

function request(action, data, opts = {}) {
	let url = `${config.baseUrl}/api/${action}`;

	let query = opts.query || {};
	let method = opts.method || 'POST';
	let isUploadFile = opts.isUploadFile || false;

	// 是否带上session信息，默认为 true
	let withSession = typeof opts.withSession === 'undefined' ? true : opts.withSession;

	return (withSession ? wxapi.getStorage(config.sessionIdKey) : Promise.resolve())
		.then(sessionId => {
			if (sessionId) {
				query.sessionId = sessionId;
			}

			return utillib.appendParams(url, query);
		})
		.then(url => {
			if (isUploadFile) {
				const fileOpts = {
					header: {
						contentType: 'multipart/form-data',
					},
					name: 'image',
				};

				// uploadFile时，data塞进formData，但是注意这里只能接收字符串
				if (data) {
					for (let i in data) {
						try {
							data[i] = JSON.stringify(data[i])
						} catch (err) {}
					}
				}

				return wxapi.uploadFile(Object.assign({ url, formData: data, method }, fileOpts, opts));
			} else {
				return wxapi.request(Object.assign({ url, data, method }, opts));
			}
		})
		.then(({ header = {}, data, statusCode }) => {
			// 判断响应头是否带有set-cookie demosid，有则存入storage
			if (withSession) {
				const { setCookie, removeCookie } = utillib.parseHeader(header);

				if ('demosid' in setCookie) {
					return wxapi.setStorage(config.sessionIdKey, setCookie.demosid)
						.then(() => ({ data, statusCode }))
						.catch(err => {
							console.warn('setStorage error', err);
							return Promise.reject('储存sessionId失败');
						});
				} else if ('demosid' in removeCookie) {
					return wxapi.removeStorage(config.sessionIdKey)
						.catch(err => {
							console.warn('removeStorage error', err);
						})
						.then(() => ({ data, statusCode }));
				}
			}

			return { data, statusCode };
		})
		.then(({ data, statusCode }) => {
			if (+statusCode !== 200 || !data) {
				return Promise.reject('连接服务器失败，请稍后再试');
			}

			// uploadFile回来的data是字符串
			if (isUploadFile) {
				try {
					data = JSON.parse(data);
				} catch (err) {
					console.warn('uploadFile parse data fail', err);
				}
			}

			if (data && data.code === 0) {
				return data.data;
			}

			return Promise.reject(data);
		});

}

module.exports = request;