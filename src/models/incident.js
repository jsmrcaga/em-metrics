const { Model, DoesNotExist } = require('@jsmrcaga/sqlite3-orm');

const { DORA: { time_to_restore, change_failure_rate }} = require('../metrics');
const { Metric, METRIC_TYPES } = require('../metrics/metric');

const { Deployment } = require('./deployment');

class IncidentCounter extends Metric {
	static METRIC_TYPE = METRIC_TYPES.COUNTER;
}

class TimeToDetect extends Metric {
	static METRIC_TYPE = METRIC_TYPES.HISTOGRAM;
}

const incident_count = new IncidentCounter('incident_count', {
	unit: 'incident'
});

const incident_restored = new IncidentCounter('incident_restored', {
	unit: 'incident'
});

const incident_finished = new IncidentCounter('incident_finished', {
	unit: 'incident'
});

const time_to_detect = new TimeToDetect('time_to_detect', {
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
			24 * 60,
			72 * 60
		]
	}
});


class Incident extends Model {
	static TABLE_NAME = 'incidents';

	static SCHEMA = {
		// id is required because it's computed beforehand
		id: { type: 'string', primary_key: true, required: true },
		project_id: { type: 'string', required: true },
		deployment_id: { type: 'string', nullable: true },
		team_id: { type: 'string', required: false, default: () => null },

		started_at: { type: 'string', required: true, default: () => new Date().toISOString() },
		restored_at: { type: 'string', nullable: true, default: () => null },
		finished_at: { type: 'string', nullable: true, default: () => null },
	};

	static create(incident) {
		return Incident.objects.insert(incident).then(() => {
			// if linked to a deployment
			//    - increment change_failure_rate
			if(incident.deployment_id) {
				change_failure_rate.increment({
					project_id: incident.project_id,
				});
			}

			// - increment incident_count
			incident_count.increment({
				project_id: incident.project_id,
			});

			if(incident.restored_at) {
				// do not return it, it's a side-effect
				this.#handle_resolution(incident);
			}

			if(incident.deployment_id) {
				// we know deployment exists because of the FK constraint
				return Deployment.objects.get(incident.deployment_id).then(deployment => {
					const ttd = new Date(deployment.deployed_at).getTime() - new Date(incident.started_at).getTime();
					time_to_detect.record(ttd, {
						project_id: incident.project_id
					});
				});
			}
		});
	}

	static #handle_resolution(incident) {
		// - record ttr
		const ttr = new Date(incident.restored_at).getTime() - new Date(incident.started_at).getTime();
		time_to_restore.record(ttr, {
			project_id: incident.project_id,
		});

		// - incidents resolved stat
		incident_restored.increment({
			project_id: incident.project_id,
		});
	}

	static #get_default_date(date) {
		if(!date) {
			return new Date().toISOString();
		} else {
			return new Date(date).toISOString();
		}
	}

	static resolve(incident, date) {
		const restored_at = this.#get_default_date(date);
		return Incident.objects.update(incident.id, {
			restored_at
		}).then(() => {
			this.#handle_resolution({
				...incident,
				restored_at
			});
		});
	}

	static finish(incident, date) {
		const default_date = this.#get_default_date(date);
		const update = {
			finished_at: date
		};

		if(!incident.restored_at) {
			update['restored_at'] = date;
		}

		return Incident.objects.update(incident.id, update).then(() => {
			// increment incidents_finished
			if(update['restored_at']) {
				this.#handle_resolution({
					...incident,
					restored_at: update['restored_at']
				});
			}

			incident_finished.increment();
		});
	}
}

module.exports = {
	Incident,
	incident_count,
	incident_restored,
	incident_finished,
	time_to_detect
};
