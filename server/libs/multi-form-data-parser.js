const multiparty = require('multiparty');
const MAX_FILE_SIZE = 5; // 5M 文件限制
const SIZE_BASE = 1024 * 1024;

/** 用法参考 routes/tickets/ajax/tickets.js 的 updateImage() 方法
 * @param {Object} req request 对象
 * @param {Number} opts.maxFilesSize 限制文件大小，单位 M
 */
module.exports = (req, opts = {}) => {
	const maxFilesSize = opts.maxFilesSize && opts.maxFilesSize > 0 ? opts.maxFilesSize * SIZE_BASE : MAX_FILE_SIZE * SIZE_BASE;
	const form = new multiparty.Form({
		encoding: 'utf8',
		maxFilesSize: maxFilesSize
	});

	return new Promise((resolve, reject) => {
		form.parse(req, (err, fields = {}, files = {}) => {
			return err ? reject(err) : resolve({ fields, files });
		});
	});
}