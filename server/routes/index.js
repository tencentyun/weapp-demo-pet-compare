const express = require('express');

const routeOptions = { 'caseSensitive': true, 'strict': true };
const routeDispatcher = express.Router(routeOptions);

const routes = {
	'/api': require('./api'),
};

// 路由嵌套，子路由分发
Object.entries(routes).forEach(([path, controllerFactory]) => {
	const router = express.Router(routeOptions);

	controllerFactory(router);

	routeDispatcher.use(path, [router]);
});

module.exports = routeDispatcher;