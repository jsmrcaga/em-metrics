const { Metric, METRIC_TYPES } = require('../metric');

class DeploymentFrequency extends Metric {
	// Counts number of deployments
	// the "frequency" will be computed with the viz tool
	static METRIC_TYPE = METRIC_TYPES.COUNTER;
}

const deployment_frequency = new DeploymentFrequency('deployment_frequency', {
	unit: 'deployment'
});

module.exports = deployment_frequency;
