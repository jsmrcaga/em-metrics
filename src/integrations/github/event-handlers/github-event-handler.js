class GithubEventHandler {
	static EVENT_NAME = null;

	constructor({ teams, github_client }) {
		this.github_client = github_client;
		this.teams = teams;
	}

	static is_allowed(event, http_headers) {
		const action_allowed = this.is_action_allowed(event, http_headers);
		const actor_allowed = this.is_actor_allowed(event, http_headers);

		return action_allowed && actor_allowed;
	}

	static is_action_allowed(event, http_headers) {
		return true;
	}

	static is_actor_allowed(event, http_headers) {
		return true;
	}

	handle(event, headers) {
		throw new Error('GithubEventHandler::handle should be overriden');
	}
}

module.exports = {
	GithubEventHandler
};
