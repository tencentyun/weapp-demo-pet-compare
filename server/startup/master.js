const os = require('os');
const cluster = require('cluster');
const config = require('../config');
const dateFormat = require('../vendors/dateformat');
const sysModel = require('../models/sysmodel');

const WORKERS = [];
const EXIT_MESSAGES = [];

let exitTimer = 0;

// ----------------------------------------------
const cpuNums = (config.env === 'local' ? 1 : os.cpus().length);

logger.info(
	`Init \`${config.PROJECT_NAME}\` server =>`,
	JSON.stringify(_.pick(config, ['host', 'port']))
);

cluster.on('exit', (worker, code, signal) => {
	const shutdownMsg = `worker process has been shutdown at <${getNowTime()}>: worker_id(${worker.id}), code(${code}), signal(${signal})`;

	EXIT_MESSAGES.push(shutdownMsg);
	logger.error(shutdownMsg);

	const workerIndex = _.findIndex(WORKERS, ['id', worker.id]);
	if (~workerIndex) {
		WORKERS.splice(workerIndex, 1);
	}

	if (exitTimer === 0) {
		exitTimer = setTimeout(() => {
			exitTimer = 0;

			// 判断进程数是否少于指定数量，若少则补充新工作进程
			_.times(Math.max(0, cpuNums - WORKERS.length), () => {
				const newWorker = cluster.fork();
				WORKERS.push(newWorker);
				bindWorkerEvent(newWorker);

				const message = `worker process has been started at <${getNowTime()}> after shutdown: new_worker_id(${newWorker.id})`;
				EXIT_MESSAGES.push(message);
				logger.info(message);
			});

			sysModel.sendAlarmMessage({
				label: 'worker_exit',
				content: EXIT_MESSAGES.join('; ') + '.',
			});

			logger.info('worker exit messages: ' + EXIT_MESSAGES.join('; '));
			EXIT_MESSAGES.length = 0;
		}, 300 * 1000); // 300秒警告重新补充工作进程间隔
	}
});

// fork workers
_.times(cpuNums, () => {
	const worker = cluster.fork();
	WORKERS.push(worker);
	bindWorkerEvent(worker);
});

sysModel.sendAlarmMessage({
	label: 'server_startup',
	content: `${config.PROJECT_NAME} server has been started at <${getNowTime()}>.`,
});
// ----------------------------------------------

function bindWorkerEvent(worker) {
	// not tested, may not work
	worker.on('error', (error) => {
		const message = 'worker error: ' + JSON.stringify({
			'msg': error.message || '-',
			'stack': error.stack || '-',
		});

		sysModel.sendAlarmMessage({ label: 'worker_error', content: message });
		logger.error(message);
	});
}

function getNowTime() {
	return dateFormat(new Date, 'yyyy-mm-dd HH:MM:ss');
}