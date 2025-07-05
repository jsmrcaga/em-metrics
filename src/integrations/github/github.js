const { InvalidSignatureError } = require('../common');

const GitHubEvents = {
	PullRequest: 'pull_request'
	Review: 'pull_request_review'
};

const GitHubActions = {

};

class GitHub {
	constructor({ secret, rsa_key }) {
		this.secret = secret;
		this.rsa_key = rsa_key;
	}

	request(path, ...options) {
		return fetch({
			url: path,
			headers: {
				...options.headers,
				Authorization: jwt
			},
			...options
		}).then(res => {
			if(!res.ok) {
				return res.text().then(text => {
					const error = new Error('Bad GitHub Request');
					error.response_status = res.status;
					error.response_body = text;

					throw error;
				});
			}

			return res.json().then(json => {
				return {
					response: res,
					data: json
				};
			});
		});
	}

	get_review_comments({ repo, pr_id, review_id }) {
		// /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments
	}

	validate_webhook(raw_body, headers={}) {
		const hmac = Crypto.createHmac('sha256', this.secret);
		hmac.update(raw_body);
		const signature = hmac.digest('hex');

		const header_signature = `sha256=${signature}`;

		const http_headers = new Headers(headers);
		const github_signature = headers.get('X-Hub-Signature-256');
		const is_equal = Crypto.timingSafeEqual(header_signature, github_signature);

		if(!is_equal) {
			throw new InvalidSignatureError('Wrong GitHub webhook signature');
		}
	}

	get_event_type(headers) {
		const http_headers = new Headers(headers);
		const event = http_headers.get('x-github-event');
		return event;
	}

	should_handle(body, headers) {
		// @TODO: validate event type is pull request
		// validate author is listed in config file
		const event = this.get_event_type(headers);

		if(event === GitHubEvents.PullRequest) {
			const ALLOWED_PR_ACTIONS = new Set(['opened', 'closed']);
			return ALLOWED_PR_ACTIONS.has(body.action);
		}

		if(event === GitHubEvents.Review) {
			const ALLOWED_REVIEW_ACTIONS = new Set(['submitted']);
			return ALLOWED_REVIEW_ACTIONS.has(body.action);
		}

		return false;
	}

	handle(body, headers) {
		const event = this.get_event_type(headers);
		if(event === GitHubEvents.PullRequest) {
			// get action type and call corresponding method
			const action = body.action;

		}
	}
}

const github = new GitHub({
	secret: process.env.GITHUB_SECRET
});

module.exports = {
	GitHub,
	github
};
