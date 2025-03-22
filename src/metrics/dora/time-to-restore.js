const { Metric, METRIC_TYPES } = require('../metric');

class TimeToRestore extends Metric {
	// Records time to restore for every incident
	// the "median" will be computed with the viz tool
	static METRIC_TYPE = METRIC_TYPES.HISTOGRAM;	
}

const time_to_restore = new TimeToRestore('time_to_restore', {
	unit: 'minute',
	advice: {
		explicitBucketBoundaries: [
			1,
			5,
			10,
			20,
			30,
			60,
			2 * 60,
			3 * 60,
			5 * 60,
			8 * 60,
			15 * 60,
			24 * 60
		]
	}
});

module.exports = time_to_restore;
