const { Token } = require('@control/jwt');
const INSTALLATION_TOKEN_CACHE = new Map();

const GITHUB_ENDPOINT = 'https://api.github.com'

class GitHubAppClient {
	#rsa_pem_key = null;

	constructor({ endpoint=GITHUB_ENDPOINT, client_id, installation_id, rsa_pem_key }) {
		if(!installation_id) {
			throw new Error('installation_id is mandatory');
		}

		this.endpoint = endpoint
		this.client_id = client_id;
		this.installation_id = installation_id;
		this.#rsa_pem_key = rsa_pem_key;
	}

	// Used for testing
	static reset_cache() {
		INSTALLATION_TOKEN_CACHE.clear()
	}

	static save_token_to_cache(installation_id, { token, expires_at }) {
		INSTALLATION_TOKEN_CACHE.set(installation_id, { token, expires_at });
	}

	#jwt() {
		// @see https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app
		return Token.generate({
			payload: {
				iss: this.client_id,
				max_age: 60 * 10, // Github limits to 10min
			}
		}, this.#rsa_pem_key, 'RS256');
	}

	#get_installation_token() {
		let installation_token = INSTALLATION_TOKEN_CACHE.get(this.installation_id);

		if(installation_token) {
			// Check if installation token is expired
			const { expires_at, token } = installation_token;

			if(expires_at && new Date(expires_at) < new Date()) {
				// reset to get new token later
				installation_token = null;
			}
		}

		if(!installation_token) {
			// use app-signed JWT to get installation token
			const jwt = this.#jwt();
			return this.raw_request(`/app/installations/${this.installation_id}/access_tokens`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${jwt}`
				}
			}).then(({ data: { token, expires_at }}) => {
				this.constructor.save_token_to_cache(this.installation_id, {
					token,
					expires_at
				});
				return token;
			});
		}

		return Promise.resolve(installation_token.token);
	}

	// Public so we can stub it
	raw_request(path, options={}) {
		const url = `${this.endpoint}${path}`;
		return fetch(url, options).then(res => {
			if(!res.ok) {
				return res.json().then(text => {
					const error = new Error('Bad GitHub Request');
					error.response_status = res.status;
					error.response_body = text;
					error.response_headers = res.headers;
					error.request_options = options;
					error.url = url;

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

	request(path, options={}) {
		return this.#get_installation_token(this.installation_id).then((token) => {
			return this.raw_request(path, {
				...options,
				headers: {
					Authorization: `Bearer ${token}`,
					// Just in case auth is passed manually
					...options.headers
				}
			});
		});
	}

	get_review_comments({ full_repo, pr_nb, review_id }) {
		return this.request(
			`/repos/${full_repo}/pulls/${pr_nb}/reviews/${review_id}/comments`
		).then(({ data: comments }) => {
			return comments.length;
		});
	}
}

module.exports = {
	GitHubAppClient
};
