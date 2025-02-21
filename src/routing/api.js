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
