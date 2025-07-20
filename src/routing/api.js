const OS = require('node:os');

module.exports = (server, options, done) => {	
	server.register(require('./auth/auth'));

	server.register(require('./pull-requests/pull-requests'), {
		prefix: '/pull-requests'
	});

	server.register(require('./deployments/deployments'), {
		prefix: '/deployments'
	});

	server.register(require('./incidents/incidents'), {
		prefix: '/incidents'
	});

	server.register(require('./ticketing/ticketing'), {
		prefix: '/ticketing'
	});

	server.get('/config', () => {
		return server.config;
	});

	server.get('/health', () => {
		return { ok: true, host: OS.hostname() };
	});

	// With auth for security
	server.get('/version', () => {
		return {
			version: process.env.EM_METRICS_VERSION || '-'
		}
	});

	done();
};
