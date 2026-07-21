/**
 * @typedef {Object} GitHubEventArgs - Necessary data for determining if the event is allowed
 * @property {[Team]} teams - The teams defined in the config
 * @property {Object} event - The webhook event
 * @property {Object} headers - The HTTP headers from the request
 */

class GithubEventHandler {
	static EVENT_NAME = null;

	constructor({ teams, github_client, config }) {
		this.github_client = github_client;
		this.teams = teams;
		this.config = config;
	}

	/**
	 * Checks if the event is allowed
	 * 
	 * @param {GitHubEventArgs} args
	 */
	static is_allowed(args) {
		const action_allowed = this.is_action_allowed(args);
		const actor_allowed = this.is_actor_allowed(args);

		return action_allowed && actor_allowed;
	}

	/**
	 * @param {GitHubEventArgs} args
	 */
	static is_action_allowed(args) {
		return true;
	}

	/**
	 * @param {GitHubEventArgs} args
	 */
	static is_actor_allowed(args) {
		return true;
	}

	handle(event, headers) {
		throw new Error('GithubEventHandler::handle should be overriden');
	}
}

module.exports = {
	GithubEventHandler
};
