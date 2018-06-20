const http = require('http');
const app = require('../app');
const sysModel = require('../models/sysmodel');
const config = require('../config');

const server = http.createServer(app).listen(config.port, config.host, () => {
	logger.info('Express server listening on port: %s', config.port);
});

server.on('clientError', (err, sock) => {
	logger.error(`Client request error: ${err.code}`);
	sock.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});


// `env === 'local'` 时不处理超时
if (config.env === 'local') return;

server.setTimeout(config.socketTimeout, (socket) => {
	let options = { 'originalUrl': '', 'body': {}, 'headers': {} };

	if (socket.parser && socket.parser.incoming) {
		options = _.pick(socket.parser.incoming, ['originalUrl', 'body', 'headers']);
	}

	const error = E.create('504', {
		detail: {
			'url': options.originalUrl,
			'body': options.body,
			'headers': options.headers,
		},
	}).value();

	let contentType, response;

	new Promise((resolve, reject) => {
		const requestPath = _.get(socket, 'parser.incoming.path', '');

		response = JSON.stringify(_.pick(error, ['code', 'msg']));

		// request is jsonp?
		const matches = options.originalUrl.match(/(?:\?|&)callback=([a-z]\w+)&?/);

		if (matches && matches.length === 2) {
			contentType = 'text/javascript';

			const callback = matches[1];
			response = `/**/ typeof ${callback} === 'function' && ${callback}(${response});`;

		} else {
			contentType = 'application/json';
		}

		resolve();
	})
		.then(() => {
			const errorInfo = JSON.stringify(error);
			logger.error(errorInfo);

			const contentLength = Buffer.byteLength(response);
			const data = `HTTP/1.1 ${error.code} Gateway Timeout\r\nContent-Type: ${contentType}; charset=utf-8\r\nContent-Length: ${contentLength}\r\n\r\n${response}`;

			if (socket.writable) {
				socket.end(data);
			}

			socket.destroy();
			sysModel.sendAlarmMessage({ label: 'server_timeout', content: errorInfo });
		});
});
