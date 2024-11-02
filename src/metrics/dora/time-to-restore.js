const { MILLISECOND_BUCKETS } = require('./common');
const { Metric, METRIC_TYPES } = require('../metric');

class TimeToRestore extends Metric {
	// Records time to restore for every incident
	// the "median" will be computed with the viz tool
	static METRIC_TYPE = METRIC_TYPES.HISTOGRAM;	
}

const time_to_restore = new TimeToRestore('time_to_restore', {
	unit: 'millisecond',
	advice: {
		explicitBucketBoundaries: MILLISECOND_BUCKETS
	}
});

module.exports = time_to_restore;
