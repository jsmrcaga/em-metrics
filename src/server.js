const os = require('node:os');
const fastify = require('fastify');
const Sentry = require('@sentry/node');

const { DoesNotExist, ValidationError } = require('@jsmrcaga/sqlite3-orm');

const { Logger, logger } = require('./config/logger');
const AjvFormats = require('./helpers/ajv/formats');
const { BadAuthError } = require('./routing/auth/auths');

const create_server = (config={}) => {
	const pino_options = Logger.get_pino_config();

	const server = fastify({
		logger: pino_options,
		ajv: {
			plugins: [
				AjvFormats
			]
		}
	});

	server.decorate('config', config);

	server.get('/health', {
		logLevel: 'silent'
	}, () => ({
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

		if(error instanceof DoesNotExist) {
			return reply.status(404).send({
				error: error.message
			});
		}

		// This will throw 400 if we have an internal validation error
		// So we'll log it to sentry too
		if(error instanceof ValidationError) {
			Sentry.captureException(error);

			return reply.status(400).send({
				errors: error.errors
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

		logger.log.error({ error });
		reply.status(500).send();
	});

	return server;
}

module.exports = {
	create_server
};
