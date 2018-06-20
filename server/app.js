const config = require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const FileStore = require('session-file-store')(session);

const app = express();

app.set('env', config.server.env);
app.set('query parser', 'simple');
app.set('case sensitive routing', true);
app.set('jsonp callback name', 'callback');
app.set('strict routing', true);
app.set('trust proxy', true);

app.use((req, res, next) => {
	// 记录请求开始时间
	req.beginTime = Date.now();
	next();
});

// 解析消息体（body）
app.use(bodyParser.json({ limit: '10mb' }));

// 注册session
app.use((req, res, next) => {
	// 从请求参数中查看是否有sessionId，有则塞进 req.headers.cookie 中
	const sessionId = (req.query || {}).sessionId || (req.body || {}).sessionId;


	if (sessionId) {
		req.headers.cookie = `demosid=${sessionId};`;
	}

	session({
		...config.session,
		saveUninitialized: false,
		// 本地 FileStore，生产环境部署可换为其他storage，参考: https://github.com/expressjs/session#compatible-session-stores
		'store': new FileStore({
			path: './data/sessions'
		}),
	})(req, res, next);
});

// 请求日志
app.use((req, res, next) => {
	const method = req.method.toUpperCase();

	const requestInfo = JSON.stringify({
		'url': req.originalUrl,
		'method': method,
		'content-type': req.get('Content-Type'),
		'body': method === 'POST' ? req.body : void(0),
		'referer': req.headers.referer,
		'user-agent': req.headers['user-agent'] || '',
	});

	console.log('[request] =>', requestInfo);
	next();
});

// 注入封装的响应函数
app.use((req, res, next) => {
	['json', 'jsonp', 'send'].forEach(method => {
		res['$' + method] = (body) => {
			if (body instanceof Error) {
				const { message, stack } = body;
				body = { code: 500, msg: JSON.stringify({ message, stack }) };
			}

			// 调用`res`原始方法
			res[method](body);

			// 计算请求耗时
			const timeCost = Date.now() - req.beginTime;

			const logInfo = '[response] => ' + JSON.stringify({
				'url': req.originalUrl,
				'method': req.method,
				'content-type': res.get('Content-Type'),
				'headers': res.getHeaders(),
				'body': body,
				'timeCost': timeCost,
			});

			console.log(logInfo);

			return res;
		};
	});

	next();
});

// 通用路由分发器
app.use(require('./routes'));

// 处理未被使用（未命中）的路由
app.use((req, res, next) => {
	res.status(404).send({ code: 404, msg: 'Not Found' });
});

// 服务器内部异常错误处理
app.use((err, req, res, next) => {
	if (res.headersSent) return;

	const { message, stack } = err;

	res.status(500).send({ code: 500, msg: 'INTERNAL_ERROR', detail: JSON.stringify({ message, stack }) });
});

module.exports = app;