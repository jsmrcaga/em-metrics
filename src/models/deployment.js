const { Model } = require('@jsmrcaga/sqlite3-orm');

const { Metric, METRIC_TYPES } = require('../metrics/metric');
const { DORA: { deployment_frequency, lead_time_for_changes }} = require('../metrics');
const { MILLISECOND_BUCKETS } = require('../metrics/dora/common');

class DeploymentDuration extends Metric {
	static METRIC_TYPE = METRIC_TYPES.HISTOGRAM;
}

class DeploymentStarted extends Metric {
	static METRIC_TYPE = METRIC_TYPES.COUNTER;
}

const deployment_duration = new DeploymentDuration('deployment_duration', {
	unit: 'millisecond',
	advice: {
		explicitBucketBoundaries: MILLISECOND_BUCKETS
	}
});

const deployment_started = new DeploymentStarted('deployment_started', {
	unit: 'deployment'
});

class Deployment extends Model {
	static TABLE_NAME = 'deployments';

	static SCHEMA = {
		// id is required because it's computed beforehand
		id: { type: 'string', primary_key: true, required: true },
		project_id: { type: 'string', required: true },

		first_commit_at: { type: 'string', required: true },
		deploy_start_at: { type: 'string', default: () => new Date().toISOString() },
		deployed_at: { type: 'string', default: () => new Date().toISOString() },
	};

	static start(deployment) {
		// insert deployment on DB
		return Deployment.objects.insert(deployment).then(() => {
			deployment_started.increment({
				project_id: deployment.project_id
			});
		});
	}

	static deployed(deployment, date=new Date().toISOString()){
		return Deployment.objects.update(deployment.id, {
			deployed_at: new Date(date).toISOString()
		}).then(() => {
			return Deployment.objects.get(deployment.id);
		}).then(deployment => {
			// record deployment duration, usually CI
			const duration = new Date(deployment.deployed_at).getTime() - new Date(deployment.deploy_start_at).getTime();
			deployment_duration.record(duration, {
				project_id: deployment.project_id
			});

			// increment deployment_count
			deployment_frequency.increment({
				project_id: deployment.project_id
			});
			// record lead_time_for_changes with 1st commit at
			const ltfc = new Date(deployment.deployed_at).getTime() - new Date(deployment.first_commit_at).getTime();
			lead_time_for_changes.record(ltfc, {
				project_id: deployment.project_id
			});
		});
	}
}

module.exports = {
	Deployment,
	deployment_duration,
	deployment_started
};
