const Crypto = require('node:crypto');
const { Model, DoesNotExist } = require('@jsmrcaga/sqlite3-orm');

const { ticket_count, time_per_ticket, ticket_estimation_changed, ticket_estimation_changed_negative } = require('../metrics/ticketing/ticketing');

const is_defined = value => {
	return ![null, undefined].includes(value);
};

class Ticket extends Model {
	static TABLE_NAME = 'tickets';

	static SCHEMA = {
		// id is required because it's computed beforehand
		id: { type: 'string', primary_key: true, required: true },
		team_id: { type: 'string' },
		project_id: { type: 'string', required: true },

		created_at: { type: 'string', default: () => new Date().toISOString() },
		started_at: { type: ['string', 'null'], default: () => null },
		finished_at: { type: ['string', 'null'], default: () => null },

		actor_hash: { type: 'string' }, // probably the hashed email
		ticket_type: { type: 'string' },
		status: { type: 'string' }, // BACKLOG, TODO, DOING, DONE, CANCELED, UNKNOWN
		parent_ticket_id: { type: ['string', 'null'], default: () => null },

		initial_estimation: { type: ['number', 'null'], default: () => null },
		current_estimation: { type: ['number', 'null'], default: () => null },
		final_estimation: { type: ['number', 'null'], default: () => null },
	};

	/**
	 * @param {Object} ticket
	 * @param {string} ticket.id - The ticket id
	 * @param {string} ticket.team_id - Team to which the ticket belongs
	 * @param {string|null} ticket.parent_ticket_id - Id of this ticket's parent ticket
	 * @param {string} ticket.ticket_type - Type of ticket
	 * @param {string} ticket.project_id - Project to which the ticket belongs
	 * @param {string} ticket.actor_email - Email of the actor.
	 * @param {number} ticket.current_estimation - Ticket estimation at the time or reception
	 * @param {'BACKLOG', 'TODO', 'DOING', 'DONE', 'CANCELED'} ticket.status - Status of the ticket
	 * @param {Date} ticket.created_at - Creation date.
	 * @param {Date} [ticket.started_at] - Date the ticket transitioned to DOING
	 * @param {Date} [ticket.finished_at] - Date the ticket transitioned to DONE
	 */
	static build(ticket = {}) {
		let final_estimation = null;
		let initial_estimation = null;

		const has_estimation = is_defined(ticket.current_estimation);
		if(ticket.finished_at && has_estimation) {
			final_estimation = ticket.current_estimation;
		}

		if((!ticket.finished_at || !ticket.started_at) && has_estimation) {
			initial_estimation = ticket.current_estimation;
		}

		const { actor_email } = ticket;
		const sha256 = Crypto.createHash('sha256');
		sha256.update(actor_email);
		const actor_hash = sha256.digest('base64');

		const ticket_params = {
			...ticket,
			final_estimation,
			initial_estimation,
			actor_hash
		};

		return new this(ticket_params);
	}

	static select_by_parent_id(ticket_id) {
		return this.DB.all(`
			SELECT
				id
			FROM ${this.TABLE_NAME} AS t
			WHERE
				t.parent_ticket_id = ?
		`, [ticket_id]).then(rows => rows);
	}

	is_done() {
		return this.status === 'DONE';
	}

	is_cancelled() {
		return this.status === 'CANCELED';
	}

	minutes_to_finish() {
		if(!is_defined(this.finished_at) || !is_defined(this.started_at)) {
			return 0;
		}

		return Math.floor((new Date(this.finished_at).getTime() - new Date(this.started_at).getTime()) / 1000 / 60);
	}

	get_metric_labels() {
		return {
			team_id: this.team_id,
			project_id: this.project_id,
			ticket_type: this.ticket_type
		};
	}

	record_done() {
		const metric_labels = this.get_metric_labels();
		// ticket_count, only here because we might be ignoring parent issues
		// but givne that the parent issue is the first one created
		// we cannot know if it's a parent issue before we get the children.
		// We will use the count notably to get the % of issues for which
		// estimations change. So counting them when they're done makes some sense.
		// Otherwise we cannot know if we've counted them already
		ticket_count.increment(metric_labels);

		// ticket_finished
		const minutes_to_finish = this.minutes_to_finish();
		if(minutes_to_finish) {
			time_per_ticket.record(minutes_to_finish, metric_labels);
		} else {
			console.log('Could not determine time to finish ticket');
		}
	}

	// Returns 0 if estimation has not changed
	// this takes into account null values
	// Possible side effect: 2 -> null -> 8 would hide the 6 point diff
	estimation_delta(previous_estimation) {
		if(!is_defined(this.current_estimation) || !is_defined(previous_estimation)) {
			return 0;
		}

		return this.current_estimation - previous_estimation;
	}

	handle_metrics_and_store() {
		const metric_labels = this.get_metric_labels();

		return Ticket.objects.get(this.id).then(db_ticket => {
			// launch necessary metrics
			// update ticket
			if(this.is_done() && !db_ticket.is_done()) {
				this.record_done();
			}

			const estimation_diff = this.estimation_delta(db_ticket.current_estimation);
			if(estimation_diff > 0) {
				// Right now histogram values cannot be negative
				// @see https://github.com/open-telemetry/opentelemetry-js/blob/78fc472c1757e63f3a61639343af33817090462f/packages/sdk-metrics/src/Instruments.ts#L134
				ticket_estimation_changed.record(Math.abs(estimation_diff), metric_labels);
			} else if (estimation_diff < 0) {
				ticket_estimation_changed_negative.record(Math.abs(estimation_diff), metric_labels);
			}

			return this.update();
		}).catch(e => {
			if(!(e instanceof DoesNotExist)) {
				throw e;
			}

			// Ticket did not exist, we can save the new one
			this.initial_estimation = this.current_estimation;

			// This means we got the webhook once the ticket was marked as done
			// side-effect: if this is a parent ticket we'd be counting extra
			// but this should never happen since we would have gotten
			// the children first
			if(this.is_done()) {
				this.record_done();
			}

			return Ticket.objects.insert(this);
		});
	}

	update() {
		return Ticket.objects.update(this.id, {
			...this
		});
	}
}

module.exports = {
	Ticket
};
