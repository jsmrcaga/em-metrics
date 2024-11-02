const { MILLISECOND_BUCKETS } = require('./common');
const { Metric, METRIC_TYPES } = require('../metric');

class LeadTimeForChanges extends Metric {
	// Records time for every PR
	static METRIC_TYPE = METRIC_TYPES.HISTOGRAM;
}

const lead_time_for_changes = new LeadTimeForChanges('lead_time_for_changes', {
	unit: 'millisecond',
	advice: {
		explicitBucketBoundaries: MILLISECOND_BUCKETS
	}
});

module.exports = lead_time_for_changes;
