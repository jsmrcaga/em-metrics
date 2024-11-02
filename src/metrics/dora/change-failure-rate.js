const { Metric, METRIC_TYPES } = require('../metric');

class ChangeFailureRate extends Metric {
	// Counts number of deployments that created incidents
	static METRIC_TYPE = METRIC_TYPES.COUNTER;
}

const cfr = new ChangeFailureRate('change_failure_count', {
	unit: 'deployment'
});

module.exports = cfr;
