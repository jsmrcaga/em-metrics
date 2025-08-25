const PR_EVENTS = {
	opened: require('./github-events/pr-open.json'),
};

const PR_REVIEW_STATES = {
	approved: require('./github-events/pr-approved.json'),
	changes_requested: require('./github-events/pr-changes-requested.json'),
	commented: require('./github-events/pr-commented.json'),
};

const get_pull_request_event = ({
	action,
	pull_request = {},
	...rest
}={}) => {
	const event = PR_EVENTS.opened;
	return {
		...event,
		action,
		pull_request: {
			...event.pull_request,
			...pull_request
		},
		...rest
	};
};

const get_pr_review_event = (state, {
	review,
	pull_request,
	...rest
}={}) => {
	if(!PR_REVIEW_STATES[state]) {
		throw new Error(`No review event type ${state}`);
	}

	const event = PR_REVIEW_STATES[state];

	return {
		...event,
		review: {
			...event.review,
			...review
		},
		pull_request: {
			...event.pull_request,
			...pull_request
		},
		...rest
	};
};

module.exports = {
	get_pull_request_event,
	get_pr_review_event
};
