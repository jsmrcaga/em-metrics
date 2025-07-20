const sinon = require('sinon');
const { expect } = require('chai');

const { Config } = require('../../../src/config');
const { Linear } = require('../../../src/integrations/linear/linear');
const { create_server } = require('../../../src/server');

const { TICKET_ID, PARENT_LABEL_ID, get_linear_issue_payload } = require('./utils/linear.utils');

const { ticket_count, time_per_ticket, ticket_estimation_changed, ticket_estimation_changed_negative } = require('../../../src/metrics/ticketing/ticketing');
const { Ticket } = require('../../../src/models/ticket');

describe('Webhooks - Linear', () => {
	let linear_validate_webhook_stub;

	let ticket_count_stub;
	let time_per_ticket_stub;

	const config = new Config();
	config.init({
		ticketing: {
			linear: {
				ignore_parent_issues: true,
				ticket_type_selector: {
					parent_label_id: PARENT_LABEL_ID
				}
			}
		}
	});

	const parent_id_server = create_server(config);

	beforeEach(() => {
		// Unblock webhook creation
		linear_validate_webhook_stub = sinon.stub(Linear.prototype, 'validate_webhook');
		linear_validate_webhook_stub.callsFake(() => true);

		// Prometheus
		ticket_count_stub = sinon.stub(ticket_count, 'increment');
		time_per_ticket_stub = sinon.stub(time_per_ticket, 'record');
		sinon.stub(ticket_estimation_changed, 'record');
		sinon.stub(ticket_estimation_changed_negative, 'record');
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('Test & update ticket', () => {
		it('should create a ticket with no label, update the label and send the labeled metric', () => {
			return parent_id_server.inject({
				path: '/webhooks/linear',
				method: 'POST',
				payload: get_linear_issue_payload({
					data: {
						// override labels
						labels: []
					}
				})
			}).then(res => {
				expect(res.statusCode).to.be.eql(200);

				// validate prometheus was not inserted
				expect(ticket_count_stub.callCount).to.be.eql(0);
				expect(time_per_ticket_stub.callCount).to.be.eql(0);

				return Ticket.objects.get(TICKET_ID);
			}).then(ticket => {
				expect(ticket.ticket_type).to.be.eql('unknown');

				return parent_id_server.inject({
					path: '/webhooks/linear',
					method: 'POST',
					// leave labels
					payload: get_linear_issue_payload({
						data: {
							state: {
								id: '1234',
								name: 'Done',
								type: 'completed'
							},
							completedAt: '2025-07-20T13:35:00.000Z'
						}
					})
				});
			}).then(res => {
				expect(res.statusCode).to.be.eql(200);

				expect(ticket_count_stub.callCount).to.be.eql(1);
				expect(time_per_ticket_stub.callCount).to.be.eql(1);

				const expected_labels = {
					team_id: 'TST',
					project_id: 'EM Metrics',
					ticket_type: 'Boilerplate'
				};
				// check that prometheus was called with label
				expect(ticket_count_stub.firstCall.args[0]).to.be.eql(expected_labels);
				expect(time_per_ticket_stub.firstCall.args[1]).to.be.eql(expected_labels);

				return Ticket.objects.get(TICKET_ID);
			}).then(ticket => {
				expect(ticket.ticket_type).to.be.eql('Boilerplate');
			});
		})
	});
});
