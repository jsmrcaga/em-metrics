const { Counter, Histogram } = require('../metric');

// Counters
const pull_request_opened_count = new Counter('pull_request_opened_count', {
	unit: 'pull requests'
});

const pull_request_closed_count = new Counter('pull_request_closed_count', {
	unit: 'pull requests'
});

const pull_request_merged_count = new Counter('pull_request_merged_count', {
	unit: 'pull requests'
});

const pull_request_loc_added = new Counter('pull_request_loc_added', {
	unit: 'lines of code'
});

const pull_request_loc_removed = new Counter('pull_request_loc_added', {
	unit: 'lines of code'
});

const pull_request_nb_comments_per_review = new Counter('pull_request_nb_comments_per_review', {
	unit: 'comments'
});

// Histogram
const pull_request_time_to_first_review_minutes = new Histogram('pull_request_time_to_first_review_minutes', {
	unit: 'minute',
	advice: {
		explicitBucketBoundaries: [
			5,
			15,
			30,
			1 * 60, // 1 hour
			3 * 60,
			5 * 60,
			10 * 60,
			15 * 60
		]
	}
});

const pull_request_time_to_merge_minutes = new Histogram('pull_request_time_to_merge_minutes', {
	unit: 'minute',
	advice: {
		explicitBucketBoundaries: [
			5,
			15,
			30,
			1 * 60, // 1 hour
			3 * 60,
			5 * 60,
			10 * 60,
			15 * 60,
			25 * 60,
			40 * 60,
		]
	}
});

module.exports = {
	pull_request_opened_count,
	pull_request_closed_count,
	pull_request_merged_count,
	pull_request_loc_added,
	pull_request_loc_removed,
	pull_request_nb_comments_per_review,
	pull_request_time_to_first_review_minutes,
	pull_request_time_to_merge_minutes,
};
