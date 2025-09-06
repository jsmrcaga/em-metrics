const { DoesNotExist } = require('@jsmrcaga/sqlite3-orm');
const { logger } = require('../../../config/logger');

const { PullRequest } = require('../../../models/pull-request');
const { GithubEventHandler } = require('./github-event-handler');

const ALLOWED_REVIEW_STATES = new Set([
	'approved',
	'changes_requested',
	'commented'
]);

class PullRequestReviewEvent extends GithubEventHandler {
	static EVENT_NAME = 'pull_request_review';

	static is_action_allowed({ event, headers }) {
		return ['submitted'].includes(event.action);
	}

	static is_actor_allowed({ teams, event, headers }) {
		// Anyone can review a PR
		// But we filter out reviews from the PR author themselves
		if(event.review.user?.login === event.pull_request.user?.login) {
			return false;
		}

		// Check the PR author, we don't want to track PR reviews for other teams
		const github_username = event.pull_request.user.login;
		const is_user_valid = teams.is_user_valid({
			github_username
		});

		if(!is_user_valid) {
			logger.log.info({
				msg: 'Ignoring PR Review event. PR Author is not allowed',
				github_username
			});
		}
		
		return is_user_valid;
	}

	handle(event, headers) {
		// will always be submitted, but just to make sure
		if(event.action !== 'submitted') {
			return Promise.resolve();
		}

		if(!ALLOWED_REVIEW_STATES.has(event.review?.state)) {
			logger.log.info({
				msg: 'Ignoring PR Review event. State is not allowed',
				state: event.review?.state ?? "null/undefined"
			});

			return Promise.resolve();
		}

		const { full_name: full_repo } = event.repository;
		const { id: pull_request_id, number: pr_nb } = event.pull_request;
		const { id: review_id, state, submitted_at } = event.review;

		return this.github_client.get_review_comments({
			full_repo,
			pr_nb,
			review_id,
		}).then(comments => {
			if(comments.every(comment => Boolean(comment.in_reply_to_id))) {
				// This "review" is only a reply
				// GitHub treats replies as a review itself
				// So it's safe to drop "only replies"
				logger.log.info({
					msg: 'Ignoring PR Review event. All comments are replies.'
				});
				return;
			}

			return PullRequest.reviewed(pull_request_id.toString(), {
				approved: state === 'approved',
				reviewed_at: submitted_at,
				nb_comments: comments?.length || 0
			});
		}).catch(error => {
			if(error instanceof DoesNotExist) {
				logger.log.error({
					error,
					msg: 'PR does not exist',
					pull_request_id
				});
			} else {
				// Possible error with comments
				logger.log.error({ error });
			}

			throw error;
		});
	}
}

module.exports = {
	PullRequestReviewEvent
};
