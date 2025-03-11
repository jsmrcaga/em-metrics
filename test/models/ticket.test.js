const sinon = require('sinon');
const { expect } = require('chai');

const { ticket_count, time_per_ticket, ticket_estimation_changed, ticket_estimation_changed_negative } = require('../../src/metrics/ticketing/ticketing');
const { Ticket } = require('../../src/models/ticket');

describe('Ticketing', () => {
	let ticket_count_stub;
	let time_per_ticket_stub;
	let ticket_estimation_changed_stub;

	beforeEach(() => {
		ticket_count_stub = sinon.stub(ticket_count, 'increment');
		time_per_ticket_stub = sinon.stub(time_per_ticket, 'record');
		ticket_estimation_changed_stub = sinon.stub(ticket_estimation_changed, 'record');
		ticket_estimation_changed_negative_stub = sinon.stub(ticket_estimation_changed_negative, 'record');
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('Nothing exists', () => {
		it('should create the ticket without sending any metrics and set initial estimation', () => {
			const ticket = new Ticket({
				id: 'fake-ticket',
				team_id: 'team-1',
				project_id: 'project-1',
				actor_hash: 'fsdfsf',
				ticket_type: 'unknown',
				current_estimation: 4,
				status: 'BACKLOG'
			});

			return Ticket.objects.all().then((tickets) => {
				expect(tickets).to.have.length(0);
				return ticket.handle_metrics_and_store();
			}).then(() => {
				return Ticket.objects.all()
			}).then(tickets => {
				expect(tickets).to.have.length(1);
				expect(tickets[0].initial_estimation).to.eql(4);
				expect(tickets[0].current_estimation).to.eql(4);
				expect(tickets[0].final_estimation).to.be.null;

				expect(ticket_count_stub.notCalled).to.be.true;
				expect(time_per_ticket_stub.notCalled).to.be.true;
				expect(ticket_estimation_changed_stub.notCalled).to.be.true;
			});
		});

		it('should create the ticket as done and send ticket_count metric', () => {
			const ticket = new Ticket({
				id: 'fake-ticket-2',
				team_id: 'team-1',
				project_id: 'project-1',
				actor_hash: 'fsdfsf',
				ticket_type: 'maintenance',
				current_estimation: 4,
				finished_at: '2024-10-12T12:34:56.000Z',
				started_at: '2024-10-12T11:00:33.123Z',
				status: 'DONE'
			});

			return Ticket.objects.all().then((tickets) => {
				expect(tickets).to.have.length(0);
				return ticket.handle_metrics_and_store();
			}).then(() => {
				return Ticket.objects.all();
			}).then(tickets => {
				expect(tickets).to.have.length(1);
				expect(tickets[0].initial_estimation).to.eql(4);
				expect(tickets[0].current_estimation).to.eql(4);
				expect(tickets[0].final_estimation).to.be.null;

				expect(ticket_count_stub.callCount).to.eql(1);
				expect(ticket_count_stub.firstCall.args).to.deep.eql([{
					team_id: 'team-1',
					project_id: 'project-1',
					ticket_type: 'maintenance'
				}]);
				expect(time_per_ticket_stub.callCount).to.eql(1);
				expect(time_per_ticket_stub.firstCall.args).to.deep.eql([94, {
					team_id: 'team-1',
					project_id: 'project-1',
					ticket_type: 'maintenance'
				}]);
				expect(ticket_estimation_changed_stub.notCalled).to.be.true;
			});
		});
	});

	describe('Ticket exists', () => {
		beforeEach(() => {
			// create ticket
			const ticket = new Ticket({
				id: 'fake-ticket-2',
				team_id: 'team-1',
				project_id: 'project-1',
				actor_hash: 'fsdfsf',
				ticket_type: 'maintenance',
				current_estimation: 4,
				status: 'BACKLOG'
			});

			return Ticket.objects.insert(ticket);
		});

		it('should not send any metrics if no significant changes', () => {
			// changed BACKLOG -> DOING
			// did not change estimation
			const ticket = new Ticket({
				id: 'fake-ticket-2',
				team_id: 'team-1',
				project_id: 'project-1',
				actor_hash: 'fsdfsf',
				ticket_type: 'maintenance',
				current_estimation: 4,
				status: 'DOING'
			});

			return ticket.handle_metrics_and_store().then(() => {
				expect(ticket_count_stub.notCalled).to.be.true;
				expect(time_per_ticket_stub.notCalled).to.be.true;
				expect(ticket_estimation_changed_stub.notCalled).to.be.true;
			});
		});

		it(`should send an estimation changed metric if estimation changed (-2)`,  () => {
			// did not change estimation
			const ticket = new Ticket({
				id: 'fake-ticket-2',
				team_id: 'team-1',
				project_id: 'project-1',
				actor_hash: 'fsdfsf',
				ticket_type: 'maintenance',
				current_estimation: 2,
				status: 'DOING'
			});

			return ticket.handle_metrics_and_store().then(() => {
				expect(ticket_count_stub.notCalled).to.be.true;
				expect(time_per_ticket_stub.notCalled).to.be.true;
				expect(ticket_estimation_changed_stub.notCalled).to.be.true;
				// Prometheus only records positive histogram values
				expect(ticket_estimation_changed_negative_stub.firstCall.args).to.deep.eql([2, {
					team_id: 'team-1',
					project_id: 'project-1',
					ticket_type: 'maintenance'
				}]);
			});
		});

		it(`should send an estimation changed metric if estimation changed (+4)`,  () => {
			// did not change estimation
			const ticket = new Ticket({
				id: 'fake-ticket-2',
				team_id: 'team-1',
				project_id: 'project-1',
				actor_hash: 'fsdfsf',
				ticket_type: 'maintenance',
				current_estimation: 8,
				status: 'DOING'
			});

			return ticket.handle_metrics_and_store().then(() => {
				expect(ticket_count_stub.notCalled).to.be.true;
				expect(time_per_ticket_stub.notCalled).to.be.true;
				expect(ticket_estimation_changed_negative_stub.notCalled).to.be.true;
				expect(ticket_estimation_changed_stub.callCount).to.eql(1);
				expect(ticket_estimation_changed_stub.firstCall.args).to.deep.eql([+4, {
					team_id: 'team-1',
					project_id: 'project-1',
					ticket_type: 'maintenance'
				}]);
			});
		});

		it('should send ticket count and time per ticket metrics if ticket is done',  () => {
			// esitmation did not change
			const ticket = new Ticket({
				id: 'fake-ticket-2',
				team_id: 'team-1',
				project_id: 'project-1',
				actor_hash: 'fsdfsf',
				ticket_type: 'maintenance',
				current_estimation: 4,
				finished_at: '2024-10-12T12:34:56.000Z',
				started_at: '2024-10-12T11:00:33.123Z',
				status: 'DONE'
			});

			return ticket.handle_metrics_and_store().then(() => {
				expect(ticket_count_stub.callCount).to.eql(1);
				expect(ticket_count_stub.firstCall.args).to.deep.eql([{
					team_id: 'team-1',
					project_id: 'project-1',
					ticket_type: 'maintenance'
				}]);
				expect(time_per_ticket_stub.firstCall.args).to.deep.eql([94, {
					team_id: 'team-1',
					project_id: 'project-1',
					ticket_type: 'maintenance'
				}]);
				expect(ticket_estimation_changed_stub.notCalled).to.be.true;
			});
		});

		it('should send all 3 metrics if ticket is done and estimation changed', () => {
			// esitmation did not change
			const ticket = new Ticket({
				id: 'fake-ticket-2',
				team_id: 'team-1',
				project_id: 'project-1',
				actor_hash: 'fsdfsf',
				ticket_type: 'maintenance',
				current_estimation: 8,
				finished_at: '2024-10-12T12:34:56.000Z',
				started_at: '2024-10-12T11:00:33.123Z',
				status: 'DONE'
			});

			return ticket.handle_metrics_and_store().then(() => {
				expect(ticket_count_stub.callCount).to.eql(1);
				expect(ticket_count_stub.firstCall.args).to.deep.eql([{
					team_id: 'team-1',
					project_id: 'project-1',
					ticket_type: 'maintenance'
				}]);
				expect(time_per_ticket_stub.firstCall.args).to.deep.eql([94, {
					team_id: 'team-1',
					project_id: 'project-1',
					ticket_type: 'maintenance'
				}]);
				expect(ticket_estimation_changed_stub.callCount).to.eql(1);
				expect(ticket_estimation_changed_stub.firstCall.args).to.deep.eql([4, {
					team_id: 'team-1',
					project_id: 'project-1',
					ticket_type: 'maintenance'
				}]);
			});
		});
	});
});
