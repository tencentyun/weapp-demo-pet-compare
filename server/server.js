const http = require('http');
const app = require('./app');
const { server: serverConfig } = require('./config');

const server = http.createServer(app).listen(serverConfig.port, serverConfig.host, () => {
	console.log('Express server listening on port: %s', serverConfig.port);
});