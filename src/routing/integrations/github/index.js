const { Webhook } = require('../../../modls/webhook');
const Github = require('../../../integrations/github');

module.exports = (server, options, done) => {
	server.post('/webhooks', (req, reply) => {
		// queue and process
		const webhook = new Webhook({
			id: 'xxx',
			integration: 'github',
			payload: req.body,
			headers: JSON.stringify(req.headers);
		});

		// Webhook should be handled by the webhook handler
		return Webhook.objects.insert(webhook).then(() => {

		});
	});

	done();
};
