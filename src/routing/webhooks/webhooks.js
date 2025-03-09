const raw_body_parser = require('../../helpers/fastify/raw-body');
const { linear, InvalidSignatureError } = require('../../integrations/linear/linear');

module.exports = (server, options, done) => {
	server.decorateRequest('raw_body', null);

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
