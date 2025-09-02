const Crypto = require('node:crypto');
const { InvalidSignatureError } = require('../common');

const { PullRequest } = require('../../models/pull-request');
const { GitHubWebhookHandlers } = require('./event-handlers');
const { GitHubAppClient } = require('./api/github-app-client');

const GitHubEvents = {
	PullRequest: 'pull_request',
	Review: 'pull_request_review'
};

class GitHub {
	#installation_token = null;
	#rsa_pem_key = null;

	constructor({ webhook_secret, client_id, rsa_pem_key_b64, teams }) {
		this.webhook_secret = webhook_secret;
		this.client_id = client_id;

		this.teams = teams;

		this.#rsa_pem_key = rsa_pem_key_b64 ? Buffer.from(rsa_pem_key_b64, 'base64').toString('utf8') : null;
	}

	validate_webhook(raw_body, headers={}) {
		const hmac = Crypto.createHmac('sha256', this.webhook_secret);
		hmac.update(raw_body);
		const signature = hmac.digest('hex');

		const computed_signature = `sha256=${signature}`;

		const http_headers = new Headers(headers);
		const github_signature = http_headers.get('X-Hub-Signature-256');
		const is_equal = Crypto.timingSafeEqual(
			Buffer.from(computed_signature),
			Buffer.from(github_signature)
		);

		if(!is_equal) {
			throw new InvalidSignatureError('Wrong GitHub webhook signature');
		}
	}

	#get_event_type(event, http_headers) {
		return http_headers.get('x-github-event');
	}

	#get_installation_id(event, http_headers) {
		const installation_id = event.installation?.id;
		if(!installation_id) {
			throw new Error('Could not find GitHub installation_id');
		}

		return installation_id;
	}

	should_handle(event, headers) {
		const http_headers = new Headers(headers);
		const event_type = this.#get_event_type(event, http_headers);

		return GitHubWebhookHandlers.is_event_allowed({
			event_type,
			event,
			http_headers,
			teams: this.teams
		});
	}

	handle(event, headers) {
		const http_headers = new Headers(headers);
		const event_type = this.#get_event_type(event, http_headers);
		const installation_id = this.#get_installation_id(event, http_headers);
		const action = event.action;

		const github_client = new GitHubAppClient({
			installation_id,
			client_id: this.client_id,
			rsa_pem_key: this.#rsa_pem_key
		});

		return GitHubWebhookHandlers.handle({
			teams: this.teams,
			github_client
		}, {
			event,
			event_type,
			headers: http_headers
		});
	}
}

module.exports = {
	GitHub,
};
