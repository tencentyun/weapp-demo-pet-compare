// inject global variables
require('../globals');

const cluster = require('cluster');
const sysModel = require('../models/sysmodel');
const isMaster = cluster.isMaster;

if (isMaster) {
	require('./master');
} else {
	require('./worker');
}

process.on('uncaughtException', error => {
	const procType = (isMaster ? 'master' : 'worker');
	const msg = error.message || '-';
	const stack = error.stack || '-';

	const content = `${procType} uncaughtException: ` + JSON.stringify({ msg, stack });
	sysModel.sendAlarmMessage({ label: procType + '_uncaughtException', content });
	logger.error(content);
});