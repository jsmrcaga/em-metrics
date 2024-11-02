const lead_time_for_changes = require('./dora/lead-time-for-changes');
const time_to_restore = require('./dora/time-to-restore');
const change_failure_rate = require('./dora/change-failure-rate');
const deployment_frequency = require('./dora/deployment-frequency');

module.exports = {
	DORA: {
		lead_time_for_changes,
		time_to_restore,
		change_failure_rate,
		deployment_frequency
	}
};
