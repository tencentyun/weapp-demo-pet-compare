module.exports = {
	isSafeInteger(number) {
		return +number <= Math.pow(2, 53) - 1;
	},

	appendParams(url, data) {
		const paramArr = [];

		for (let key in data) {
			let value = data[key];
			if (typeof value === 'object') {
				try {
					value = JSON.stringify(value);
				} catch (e) {}
			}

			paramArr.push(`${key}=${encodeURIComponent(value)}`);
		}

		return (url.indexOf('?') > -1 ? `${url}&` : `${url}?`) + paramArr.join('&');
	},

	parseParams(params = {}) {
		for (let key in params) {
			let value = params[key];
			if (typeof value === 'string') {
				value = decodeURIComponent(value);
			}
			try {
				const _value = JSON.parse(value);
				if (typeof _value === 'number') {
					if (this.isSafeInteger(_value)) {
						value = _value;
					}
				} else {
					value = _value;
				}
			} catch (err) {}
			params[key] = value;
		}

		console.log('receive data', params);

		return params;
	},

	rpx2px(rpx) {
		return rpx / 2;
	},

	/**
	 * 简单的解析cookie字符串方法，max-age和expires统一为过期时刻时间戳（ms）
	 * @param cookieString
	 * @return {Object}
	 */
	parseCookie(cookieString) {
		const cookie = {};

		const [keyValue, ...options] = cookieString.split(';');
		const [key, value] = keyValue.split('=');

		Object.assign(cookie, { key: key.trim(), value });

		options.forEach((option) => {
			const [optionKey, optionValue] = option.split('=');

			cookie[optionKey.toLowerCase().trim()] = decodeURIComponent(optionValue);
		});

		if (cookie['max-age']) {
			cookie.expires = Date.now() + (cookie['max-age'] * 60);
		} else if (cookie.expires) {
			cookie.expires = new Date(cookie.expires).getTime();
		}

		return cookie;
	},

	parseHeader(headers = {}) {
		const setCookies = [];

		for (const key in headers) {
			if (key.toLowerCase() === 'set-cookie') {
				const header = headers[key];

				// 兼容低版本基础库中响应的headers中每个字段内都是数组
				const _headerArr = Object.prototype.toString.call(header) === '[object Array]' ? header : header.split(',');

				const headerArr = [];

				for (let i = 0, l = _headerArr.length; i < l; i++) {
					const _tmpArr = _headerArr[i].trim().split(';');

					if (_tmpArr[0] && _tmpArr[0].split('=').length > 1) {
						headerArr.push(_headerArr[i]);
					} else if (headerArr[headerArr.length - 1]) {
						headerArr[headerArr.length - 1] += `,${_headerArr[i]}`;
					}
				}

				headerArr.forEach(row => setCookies.push(row));
				break;
			}
		}

		const result = {
			setCookie: {},
			removeCookie: {},
		};

		setCookies.forEach(item => {
			const { key, value, expires } = this.parseCookie(item);

			// 不设置的话，永不过期
			if (expires < Date.now() || !value) {
				result.removeCookie[key] = value;
			} else {
				result.setCookie[key] = value;
			}
		});

		return result;
	},
};