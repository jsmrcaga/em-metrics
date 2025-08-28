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

	static is_actor_allowed({ event, headers }) {
		// Anyone can review a PR
		// But we filter out reviews from the PR author themselves
		if(event.review.user?.login === event.pull_request.user?.login) {
			return false;
		}
		
		return true;
	}

	handle(event, headers) {
		// will always be submitted, but just to make sure
		if(!event.action === 'submitted') {
			return Promise.resolve();
		}

		if(!ALLOWED_REVIEW_STATES.has(event.review?.state)) {
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
				return;
			}

			return PullRequest.reviewed(pull_request_id, {
				approved: state === 'approved',
				reviewed_at: submitted_at,
				nb_comments: comments?.length || 0
			});
		});
	}
}

module.exports = {
	PullRequestReviewEvent
};
