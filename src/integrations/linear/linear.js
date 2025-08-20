const Crypto = require('node:crypto');

const { Ticket } = require('../../models/ticket');
const { Incident } = require('../../models/incident');
const { InvalidSignatureError } = require('../common');

/**
 * @typedef {Object} LinearIssueLabel
 * @property {string} id
 * @property {string} name
 * @property {string|null} [parentId]
 */

/**
 * @typedef {Object} LinearIssue
 * @property {string} identifier - The issue id
 * @property {number|null} estimate - The issue estimate
 * @property {string} createdAt - Time the issue was created. ISOString
 * @property {string|null} startedAt - Time the issue started
 * @property {string|null} completedAt - Time the issue started
 * @property {Object} team
 * @property {string} team.key - The team short code, ex KFC
 * @property {Object|null} project
 * @property {string} project.name - The name of the project
 * @property {Object|null} assignee
 * @property {string} assignee.email - The email of the assignee
 * @property {LinearIssueLabel[]} labels
 * @property {Object} state - Issue status
 * @property {'triage'|'backlog'|'unstarted'|'started'|'completed'|'canceled'} state.type
 */ 

/**
 * @typedef {Object} TicketTypeSelector
 * @property {string|null} [parent_label_id]
 * @property {string[]|null} [allow_list]
 */

const LinearStatusMapping = {
	triage: 'BACKLOG',
	backlog: 'BACKLOG',
	unstarted: 'TODO',
	started: 'DOING',
	completed: 'DONE',
	canceled: 'CANCELED'
};

const TicketToIncidentStatusMapping = {

};

class Linear {
	/**
	 * @param {string} secret - Linear webhook secret
	 * @param {TicketTypeSelector} ticket_type_selector
	 */
	constructor({
		secret,
		ignore_parent_issues=true,
		ticket_type_selector={},
		incident_label_id=null
	}) {
		this.secret = secret;
		this.ignore_parent_issues = ignore_parent_issues;
		this.ticket_type_selector = {
			parent_label_id: ticket_type_selector.parent_label_id,
			allow_list: ticket_type_selector.allow_list ? new Set(ticket_type_selector.allow_list) : null
		};
		this.incident_label_id = incident_label_id;
	}

	/**
	 * @see https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/objects/WorkflowState#type
	 */
	static map_workflow_to_ticket_status(workflow_state) {
 		return LinearStatusMapping[workflow_state] || 'UNKNOWN';
	}

	/**
	 * Finds the ticket type from the Linear issue labels.
	 * @param {TicketTypeSelector} ticket_type_selector
	 * @param {LinearIssueLabel[]} labels
	 */
	static find_ticket_type(ticket_type_selector={}, labels=[]) {
		const { allow_list, parent_label_id } = ticket_type_selector;

		if(!parent_label_id && (!allow_list || !allow_list.size)) {
			return 'unknown';
		}

		if(parent_label_id) {
			return labels.find(l => l.parentId === parent_label_id)?.name ?? 'unknown';
		}

		// allow_list
		return labels.find(l => allow_list.has(l.id))?.name ?? 'unknown';
	}

	validate_webhook(payload, headers) {
		const hmac = Crypto.createHmac('sha256', this.secret);
		hmac.update(payload);
		const signature = hmac.digest('hex');

		const http_headers = new Headers(headers);
		const linear_signature = http_headers.get('linear-signature');

		if(linear_signature !== signature) {
			throw new InvalidSignatureError('Wrong Linear signature');
		}
	}

	should_handle(payload) {
		return payload.type === 'Issue';
	}

	handle(payload) {
		if(payload.type === 'Issue') {
			return this.handle_ticket(payload)
		}

		throw new Error(`Should not handle payload of type: ${payload.type}`);
	}

	is_ticket_incident(issue) {
		return Boolean(labels.find(l => this.incident_label_id === l.id));
	}

	handle_incident(ticket) {
		// Possible statuses
		//   declared (Planned)
		//   picked up (Started)
		//   service restored (Done)
		//   fixed/finished (?)
		// Caveats:
		// * No deployment_id, so time_to_detect will not be stored
	}

	handle_ticket({ data: issue }) {
		// Pass to handler
		return this.to_ticket(issue).then(ticket => {
			if(!ticket) {
				return;
			}

			if(this.is_ticket_incident(issue)) {
				// Handle incident flow
				return this.handle_incident(ticket);
			}

			return ticket.handle_metrics_and_store();
		}).catch(e => {
			console.error(e);
		});
	}

	/**
	 * @param {LinearIssue} issue
	 */
	to_ticket(issue) {
		if(!issue.project) {
			// cannot save without project
			const error = new Error('Issue has no project');
			error.issue_id = issue.identifier;
			throw error;
		}

		// This is done here because if Linear told us "isParent = true"
		// we could avoid it entirely It's also the way Linear works
		// Maybe other prvoiders don't have parent/children relations
		return Ticket.select_by_parent_id(issue.identifier).then(results => {
			if(this.ignore_parent_issues && results.length) {
				return null;
			}

			return Ticket.build({
				id: issue.identifier,
				team_id: issue.team.key,
				project_id: issue.project?.name,
				created_at: issue.createdAt,
				started_at: issue.startedAt ?? null,
				finished_at: issue.completedAt,
				actor_email: issue.assignee?.email ?? '',
				ticket_type: this.constructor.find_ticket_type(this.ticket_type_selector, issue.labels),
				status: this.constructor.map_workflow_to_ticket_status(issue.state.type),
				current_estimation: issue.estimate,
			});
		});
	}
}

Linear.InvalidSignatureError = InvalidSignatureError;

module.exports = {
	Linear,
	InvalidSignatureError
};
