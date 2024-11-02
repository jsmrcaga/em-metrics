const { TokenAuth, BasicAuth } = require('./auths');

// process.env.EM_METRICS_NO_AUTH
// process.env.EM_METRICS_TOKEN_AUTH
// process.env.EM_METRICS_BASIC_AUTH_USERNAME
// process.env.EM_METRICS_BASIC_AUTH_PASSWORD
const auth = (server, options, done) => {
	server.addHook('onRequest', (request, reply, done) => {
		// we do the init here so that we can change the
		// environment dynamically
		// Makes testing easier too
		if(process.env.EM_METRICS_NO_AUTH) {
			return done();
		}

		const ALLOWED_AUTHS = [
			new BasicAuth({
				username: process.env.EM_METRICS_BASIC_AUTH_USERNAME,
				password: process.env.EM_METRICS_BASIC_AUTH_PASSWORD
			}),
			new TokenAuth(process.env.EM_METRICS_TOKEN_AUTH)
		];

		const headers = new Headers(request.headers);

		const auth_header = headers.get('authorization');

		if(!auth_header) {
			return reply.status(401).send('Authorization Required');
		}

		for(const auth of ALLOWED_AUTHS) {
			if(auth.test(auth_header)) {
				return done();
			}
		}

		return reply.status(401).send();
	});

	done();
};

// fastify magic to re-use the same scope "above"
auth[Symbol.for('skip-override')] = true;

module.exports = auth;
