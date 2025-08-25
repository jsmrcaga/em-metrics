const raw_body_parser = require('../../helpers/fastify/raw-body');
const { InvalidSignatureError } = require('../../integrations/common');

const { Linear } = require('../../integrations/linear/linear');
const { GitHub } = require('../../integrations/github/github');

module.exports = (server, options, done) => {
	server.decorateRequest('raw_body', null);

	const linear = new Linear({
		secret: process.env.LINEAR_SECRET,
		ignore_parent_issues: server.config?.config?.ticketing?.linear?.ignore_parent_issues,
		ticket_type_selector: server.config?.config?.ticketing?.linear?.ticket_type_selector,
	});

	const github = new GitHub({
		endpoint: process.env.GITHUB_ENDPOINT,
		webhook_secret: process.env.GITHUB_WEBHOOK_SECRET,
		client_id: process.env.GITHUB_CLIENT_ID,
		rsa_pem_key_b64: process.env.GITHUB_RSA_PEM_KEY_B64,
		teams: server.config.teams
	});

	// Will need to create one webhook per team
	server.post('/linear', {
		preParsing: raw_body_parser
	}, (req, reply) => {
		// Validate Linear signature
		try {
			linear.validate_webhook(req.raw_body, req.headers);
		} catch(e) {
			if(e instanceof InvalidSignatureError) {
				return reply.status(404).send();
			}

			throw e;
		}

		// Replying after handling to ease testing and error handling

		// Filter non Issue events
		if(!linear.should_handle(req.body)) {
			return reply.status(200).send();
		}

		// Errors will not go to fastify handler if we don't resolve the promise
		return linear.handle(req.body).then(() => {
			return reply.status(200).send();
		});
	});

	server.post('/github', {
		preParsing: raw_body_parser
	}, (req, reply) => {
		// Validate GitHub signature
		try {
			github.validate_webhook(req.raw_body, req.headers);
		} catch(e) {
			if(e instanceof InvalidSignatureError) {
				return reply.status(404).send();
			}

			throw e;
		}

		if(!github.should_handle(req.body, req.headers)) {
			return reply.status(200).send();
		}

		return github.handle(req.body, req.headers).then(() => {
			return reply.status(200).send();
		});
	});

	done();
}
