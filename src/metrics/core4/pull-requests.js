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


// Histograms
const LoC_BUCKETS =  [
	1,
	10,
	50,
	100,
	300,
	750,
	1250,
	1700,
	2500,
	5000
];

const pull_request_loc_added = new Histogram('pull_request_loc_added', {
	unit: 'lines of code',
	advice: {
		explicitBucketBoundaries: LoC_BUCKETS
	}
});

const pull_request_loc_removed = new Histogram('pull_request_loc_added', {
	unit: 'lines of code',
	advice: {
		explicitBucketBoundaries: LoC_BUCKETS
	}
});

const pull_request_nb_comments_per_review = new Histogram('pull_request_nb_comments_per_review', {
	unit: 'comments',
	advice: {
		explicitBucketBoundaries: [
			1,
			3,
			5,
			10,
			30,
			50,
			100
		]
	}
});

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
			15 * 60,
			30 * 60,
			72 * 60,
		]
	}
});

const pull_request_time_to_approve_minutes = new Histogram('pull_request_time_to_approve_minutes', {
	unit: 'minute',
	advice: {
		explicitBucketBoundaries: [
			5,
			15,
			30,
			1 * 60, // 1 hour
			3 * 60,
			5 * 60,
			15 * 60,
			30 * 60,
			72 * 60,
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

const pull_request_nb_reviews_per_pr = new Histogram('pull_request_nb_reviews_per_pr', {
	unit: 'reviews/pr',
	advice: {
		explicitBucketBoundaries: [
			1,
			2,
			3,
			4,
			5,
			7,
			10,
			15
		]
	}
});

module.exports = {
	pull_request_opened_count,
	pull_request_closed_count,
	pull_request_merged_count,
	pull_request_loc_added,
	pull_request_loc_removed,
	pull_request_nb_reviews_per_pr,
	pull_request_nb_comments_per_review,
	pull_request_time_to_approve_minutes,
	pull_request_time_to_first_review_minutes,
	pull_request_time_to_merge_minutes,
};
