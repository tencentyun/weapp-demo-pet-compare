const request = require('./wxlib-modules/request');
const _wxlib = exports = module.exports = require('./wxlib-modules/index');

exports.request = (...params) => {
	return request(...params)
		.catch(err => {
			const code = err ? String(err.code) : '';
			// 这里拦截一些全局错误
			switch (code) {
				case 'NOT-LOGIN': // 未登陆
					_wxlib.login.logout();
					return _wxlib.login.login()
						.then(() => request(...params));
				default:
					return Promise.reject(err);
			}
		})
};

