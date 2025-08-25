const { GitHubWebhookHandlers } = require('./github-webhook-handlers');

const { PullRequestEvent } = require('./pull-request.event');
const { PullRequestReviewEvent } = require('./pull-request-review.event');

GitHubWebhookHandlers.register(
	PullRequestEvent,
	PullRequestReviewEvent
);

module.exports = {
	GitHubWebhookHandlers
};
