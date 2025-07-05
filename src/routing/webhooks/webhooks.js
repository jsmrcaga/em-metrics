const raw_body_parser = require('../../helpers/fastify/raw-body');
const { Linear } = require('../../integrations/linear/linear');
const { InvalidSignatureError } = require('../../integrations/common');

module.exports = (server, options, done) => {
	server.decorateRequest('raw_body', null);

	const linear = new Linear({
		secret: process.env.LINEAR_SECRET,
		ignore_parent_issues: server.config?.config?.ticketing?.linear?.ignore_parent_issues,
		ticket_type_selector: server.config?.config?.ticketing?.linear?.ticket_type_selector,
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

		// Errors will not go to fastify handler
		return linear.handle(req.body).then(() => {
			return reply.status(200).send();
		});
	});

	done();
}
