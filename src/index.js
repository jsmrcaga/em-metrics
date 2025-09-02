require('./instrumentation/sentry');

const { create_server } = require('./server');
const { config } = require('./config');
const { Logger } = require('./config/logger');
const { default_db } = require('@jsmrcaga/sqlite3-orm');
const { flush: flush_metrics } = require('./remote-metrics');

process.on('SIGINT', () => {
	return flush_metrics().finally(() => {
		return process.exit(0);
	});
});

process.on('SIGTERM', () => {
	return flush_metrics().finally(() => {
		return process.exit(0);
	});
});

process.on('uncaughException', (error) => {
	Logger.log.error({ error });
	process.exit(1);
});

process.on('unhandledRejection', (error) => {
	Logger.log.error({ error });
	process.exit(1);
});

if(require.main === module) {
	return default_db.init(process.env.SQLITE_DB).then(() => {
		return config.load(process.env.CONFIG);
	}).then(() => {
		const server = create_server(config);
		return server.listen({
			host: process.env.HOST || '0.0.0.0',
			port: process.env.PORT || 3000
		})
	}).then(interface => {
		Logger.log.info('Listening on', interface);
	});
}
