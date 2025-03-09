const sinon = require('sinon');
const { expect } = require('chai');

const { server } = require('../../src/server');

const { ticket_count, time_per_ticket, ticket_estimation_changed } = require('../../src/metrics/ticketing/ticketing');
const { Ticket } = require('../../src/models/ticket');
const { Linear } = require('../../src/integrations/linear/linear');

/** 
 * @type {Object} payload
 * @property {LinearIssue} payload.data
 * @property {'Issue'} payload.type
 * */
const DEFAULT_LINEAR_PAYLOAD = {
	type: 'Issue',
	data: {
		identifier: 'TEAM-1234',
		estimate: null,
		createdAt: '2024-10-11T12:00:00.000Z',
		startedAt: '2024-10-11T13:00:00.000Z',
		completedAt: null,
		team: {
			key: 'TEAM'
		},
		project: {
			name: 'Project 1'
		},
		assignee: {
			email: 'assignee1@example.com'
		},
		labels: [{
			id: 'label1',
			name: 'Label 1'
		}],
		state: {
			type: 'started'
		},
	},
};

const DEFAULT_METRIC_LABELS = {
	team_id: 'TEAM',
	project_id: 'Project 1',
	ticket_type: 'unknown'
};

const call_webhook = (payload = DEFAULT_LINEAR_PAYLOAD) => {
	return server.inject({
		method: 'POST',
		url: '/webhooks/linear',
		payload
	});
}

describe('Webhooks - Linear', () => {
	let ticket_count_stub;
	let time_per_ticket_stub;
	let ticket_estimation_changed_stub;

	beforeEach(() => {
		ticket_count_stub = sinon.stub(ticket_count, 'increment');
		time_per_ticket_stub = sinon.stub(time_per_ticket, 'record');
		ticket_estimation_changed_stub = sinon.stub(ticket_estimation_changed, 'record');

		sinon.stub(Linear.prototype, 'validate_webhook').callsFake(() => true);
	});

	afterEach(() => {
		sinon.restore();
	});

	it('should transition ticket to DONE and send metric', () => {
		// first time ticket arrives
		return Ticket.objects.all().then(tickets => {
			expect(tickets).to.have.length(0);

			return call_webhook();
		}).then(res => {
			expect(res.statusCode).to.eql(200);

			return Ticket.objects.all();
		}).then(tickets => {
			expect(tickets).to.have.length(1);
			const [ticket] = tickets;
			expect(ticket.status).to.eql('DOING');

			expect(ticket_count_stub.notCalled).to.be.true;
			expect(time_per_ticket_stub.notCalled).to.be.true;
			expect(ticket_estimation_changed_stub.notCalled).to.be.true;

			return call_webhook({
				...DEFAULT_LINEAR_PAYLOAD,
				data: {
					...DEFAULT_LINEAR_PAYLOAD.data,
					completedAt: '2024-10-12T15:00:00.000Z',
					state: {
						type: 'completed'
					}
				}
			});
		}).then(res => {
			expect(res.statusCode).to.eql(200);

			expect(ticket_count_stub.callCount).to.eql(1);
			expect(ticket_count_stub.firstCall.args).to.deep.eql([1, DEFAULT_METRIC_LABELS]);
			expect(time_per_ticket_stub.callCount).to.eql(1);
			expect(time_per_ticket_stub.firstCall.args).to.deep.eql([1560, DEFAULT_METRIC_LABELS]);
			expect(ticket_estimation_changed_stub.notCalled).to.be.true;
		});
	});

	it('should recognize estimation changed and send metric', () => {
		return Ticket.objects.all().then(tickets => {
			expect(tickets).to.have.length(0);

			return call_webhook({
				...DEFAULT_LINEAR_PAYLOAD,
				data: {
					...DEFAULT_LINEAR_PAYLOAD.data,
					estimate: 4
				}
			});
		}).then(res => {
			expect(res.statusCode).to.eql(200);

			return Ticket.objects.all();
		}).then(tickets => {
			expect(tickets).to.have.length(1);
			const [ticket] = tickets;
			expect(ticket.current_estimation).to.eql(4);
			expect(ticket.initial_estimation).to.eql(4);

			expect(ticket_count_stub.notCalled).to.be.true;
			expect(time_per_ticket_stub.notCalled).to.be.true;
			expect(ticket_estimation_changed_stub.notCalled).to.be.true;

			return call_webhook({
				...DEFAULT_LINEAR_PAYLOAD,
				data: {
					...DEFAULT_LINEAR_PAYLOAD.data,
					estimate: 13
				}
			});
		}).then(res => {
			expect(res.statusCode).to.eql(200);

			expect(ticket_count_stub.notCalled).to.be.true;
			expect(time_per_ticket_stub.notCalled).to.be.true;
			expect(ticket_estimation_changed_stub.callCount).to.eql(1);
			expect(ticket_estimation_changed_stub.firstCall.args).to.deep.eql([9, DEFAULT_METRIC_LABELS]);
		});
	});
});
