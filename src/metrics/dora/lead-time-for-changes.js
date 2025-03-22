const { Metric, METRIC_TYPES } = require('../metric');

class LeadTimeForChanges extends Metric {
	// Records time for every PR
	static METRIC_TYPE = METRIC_TYPES.HISTOGRAM;
}

const lead_time_for_changes = new LeadTimeForChanges('lead_time_for_changes', {
	unit: 'minute',
	advice: {
		explicitBucketBoundaries: [
			5,
			15,
			30,
			60,
			2.5 * 60,
			5 * 60, // ~1 devday,
			8 * 60,
			15 * 60,
			24 * 60,
			2 * 24 * 60, // 2 days
			5 * 24 * 60, // 5 days
		]
	}
});

module.exports = lead_time_for_changes;
