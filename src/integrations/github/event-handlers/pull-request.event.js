const { logger } = require('../../../config/logger');

const { PullRequest } = require('../../../models/pull-request');
const { GithubEventHandler } = require('./github-event-handler');

class PullRequestEvent extends GithubEventHandler {
	static EVENT_NAME = 'pull_request';

	static is_action_allowed({ teams, event, headers }) {
		return ['opened', 'closed'].includes(event.action);
	}

	static is_actor_allowed({ teams, event, headers }) {
		const github_username = event.pull_request.user.login;
		const is_user_valid = teams.is_user_valid({
			github_username
		});

		if(!is_user_valid) {
			logger.log.info({
				msg: 'Ignoring Pull Request event. User is not allowed',
				github_username
			});
		}

		return is_user_valid;
	}

	handle(event, headers) {
		const { action } = event;
		const { id: pull_request_id } = event.pull_request;

		if(action === 'opened') {
			const { created_at, additions, deletions } = event.pull_request;

			// find team
			// sender.login for pr opened
			const team_id = this.teams.get_team_from_context({
				github_username: event.pull_request.user.login,
			});
			const pull_request = new PullRequest({
				id: pull_request_id.toString(),
				team_id,
				opened_at: created_at,
			});

			return PullRequest.created(pull_request, {
				additions,
				deletions
			});
		}

		if(action === 'closed') {
			if(event.pull_request?.merged) {
				const { merged_at } = event.pull_request;

				return PullRequest.merged(pull_request_id, {
					merged_at
				});
			}

			const { closed_at } = event.pull_request;

			return PullRequest.closed(pull_request_id, {
				closed_at
			});
		}
	}
}

module.exports = {
	PullRequestEvent
};
