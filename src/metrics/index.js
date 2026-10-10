const lead_time_for_changes = require('./dora/lead-time-for-changes');
const time_to_restore = require('./dora/time-to-restore');
const change_failure_rate = require('./dora/change-failure-rate');
const deployment_frequency = require('./dora/deployment-frequency');

const {
	ticket_count,
	time_per_ticket,
	ticket_estimation_changed,
	ticket_estimation_changed_negative
} = require('./ticketing/ticketing');

const {
	commit_count,
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
} = require('./core4/pull-requests');

module.exports = {
	DORA: {
		lead_time_for_changes,
		time_to_restore,
		change_failure_rate,
		deployment_frequency
	},
	TICKETING: {
		ticket_count,
		time_per_ticket,
		ticket_estimation_changed,
		ticket_estimation_changed_negative
	},
	CORE4: {
		commit_count,
		pull_request_opened_count,
		pull_request_closed_count,
		pull_request_merged_count,
		pull_request_loc_added,
		pull_request_loc_removed,
		pull_request_nb_reviews_per_pr,
		pull_request_nb_comments_per_review,
		pull_request_time_to_approve_minutes,
		pull_request_time_to_first_review_minutes,
		pull_request_time_to_merge_minutes
	}
};
