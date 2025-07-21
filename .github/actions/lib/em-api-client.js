const { PullRequestsClient } = require('./api/pull-requests');

class EMAPIClient {
	constructor({ endpoint=process.env.EM_METRICS_ENDPOINT, token=process.env.EM_METRICS_TOKEN } = {}) {
		if(!endpoint) {
			throw new Error('Endpoint is required');
		}

		if(!token) {
			throw new Error('Token is required');
		}

		this.token = token;
		this.endpoint = endpoint;

		this.pull_request = new PullRequestsClient(this);
	}

	request(path, { headers={}, body, ...options } = {}) {
		headers['Authorization'] = `token ${this.token}`;

		if(body && (typeof body === 'object')) {
			headers['Content-Type']	= 'application/json';
			body = JSON.stringify(body);
		}

		const url = `${this.endpoint}${path}`;
		return fetch(url, {
			headers,
			body,
			...options
		}).then(res => {
			if(!res.ok) {
				return res.text().then(text => {
					const error = new Error('Error requesting EM Metrics');
					error.url = url;
					error.response = text;
					error.status = res.status;
					throw error;
				});
			}

			return res;
		});
	}
}

module.exports = {
	EMAPIClient
};
