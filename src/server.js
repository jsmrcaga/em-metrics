const os = require('node:os');
const fastify = require('fastify');
const Sentry = require('@sentry/node');

const { DoesNotExist, ValidationError } = require('@jsmrcaga/sqlite3-orm');

const { BadAuthError } = require('./routing/auth/auths');

const server = fastify({
	logger: process.env.NODE_ENV === 'production'
});

server.get('/health', () => ({
	ok: true,
}));

server.register(require('./routing/dev/dev'));

// API
server.register(require('./routing/api'), {
	prefix: '/api/v1'
});

server.register(require('./routing/webhooks/webhooks'), {
	prefix: '/webhooks'
})

server.setErrorHandler((error, req, reply) => {
	if(error.code === 'FST_ERR_VALIDATION') {
		return reply.status(400).send({
			errors: error.validation
		});
	}

	// Fastify default errors
	if(error.statusCode) {
		return reply.status(error.statusCode).send(error.message);
	}

	if(error instanceof BadAuthError) {
		return reply.status(403).send(error.message);
	}

	if(error instanceof ValidationError) {
		return reply.status(400).send({
			errors: error.errors
		});
	}

	if(error instanceof DoesNotExist) {
		return reply.status(404).send({
			error: error.message
		});
	}

	if(error.code === 'SQLITE_CONSTRAINT') {
		// We might wanna know what happened
		Sentry.captureException(error);

		return reply.status(400).send({
			errors: [{
				message: 'Database constraint violated'
			}]
		});
	}


	Sentry.captureException(error);

	console.error(error);
	reply.status(500).send();
});

module.exports = {
	server
};
