const os = require('node:os');
const fastify = require('fastify');

const { DoesNotExist, ValidationError } = require('@jsmrcaga/sqlite3-orm');

const { BadAuthError } = require('./routing/auth/auths');

const server = fastify();

server.get('/health', () => ({
	ok: true,
}));

server.register(require('./routing/dev/dev'));

// API
server.register(require('./routing/api'), {
	prefix: '/api/v1'
});

server.setErrorHandler((error, req, reply) => {
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

	if(error.code === 'FST_ERR_VALIDATION') {
		return reply.status(400).send({
			errors: error.validation
		});
	}

	if(error.code === 'SQLITE_CONSTRAINT') {
		return reply.status(400).send({
			errors: [{
				message: 'Database constraint violated'
			}]
		});
	}

	console.error(error);
	reply.status(500).send();
});

module.exports = {
	server
};
