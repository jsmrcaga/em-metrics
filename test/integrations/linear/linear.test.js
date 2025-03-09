const Crypto = require('node:crypto');
const { expect } = require('chai');

const { Linear, InvalidSignatureError } = require('../../../src/integrations/linear/linear');
const { Ticket } = require('../../../src/models/ticket');

const secret = 'test-super-secret';
const linear = new Linear({
	secret,
});

describe('Integrations - Linear', () => {
	describe('Webhook validation', () => {
		const payload = 'this is my super secret payload';

		it('should throw an error for an invalid signature', () => {
			const run = () => linear.validate_webhook(payload, {
				'linear-signature': '1234'
			});

			expect(run).to.throw(InvalidSignatureError);
		});

		it('should not throw an error if valid signature', () => {
			const hmac = Crypto.createHmac('sha256', secret);
			hmac.update(payload);
			const expected_signature = hmac.digest('hex');

			const run = () => linear.validate_webhook(payload, {
				'linear-signature': expected_signature
			});

			expect(run).not.to.throw(InvalidSignatureError);
		});
	});

	describe('Ticket instanciation', () => {
		const now = new Date().toISOString();
		const webhook_payload = {
			identifier: 'KFC-123',
			team: {
				key :'KFC'
			},
			project: {
				name: 'Test project'
			},
			estimate: 4,
			createdAt: now,
			startedAt: null,
			completedAt: null,
			assignee: {
				email: '12134@1234.com'
			},
			labels: [{
				id: 'label-1234',
				name: 'chicken'
			}],
			state: {
				type: 'backlog'
			}
		};

		it('should instanciate a ticket (with no label selector)', () => {
			return linear.to_ticket(webhook_payload).then(ticket => {
				expect(ticket).to.deep.eql({
					id: 'KFC-123',
					team_id: 'KFC',
					project_id: 'Test project',
					created_at: now,
					started_at: null,
					finished_at: null,
					actor_hash: 'Rr2agZFGwi7LfDA2ybX3k4Hol3R26di6aA8LDzzAHVU=',
					ticket_type: 'unknown',
					status: 'BACKLOG',
					initial_estimation: 4,
					current_estimation: 4,
					final_estimation: null,
					parent_ticket_id: null
				});
			});
		});

		describe('with parent issue id in DB', () => {
			beforeEach(() => {
				const ticket = new Ticket({
					id: 'fake-ticket',
					parent_ticket_id: 'KFC-123',
					team_id: 'team-1',
					project_id: 'project-1',
					actor_hash: 'fsdfsf',
					ticket_type: 'unknown',
					status: 'UNKNOWN'
				});

				return Ticket.objects.insert(ticket);
			});

			it('should not instanciate any ticket if there is a ticket with it as parent and parents are ignored', () => {
				const linear = new Linear({
					secret,
					ignore_parent_issues: true
				});

				return linear.to_ticket(webhook_payload).then(ticket => {
					expect(ticket).to.be.null;
				});
			});

			it('should instanciate any ticket if there is a ticket with it as parent and parents are not ignored', () => {
				const linear = new Linear({
					secret,
					ignore_parent_issues: false
				});

				return linear.to_ticket(webhook_payload).then(ticket => {
					expect(ticket).to.not.be.null;
				});
			});
		});
	});

	describe('Label selector', () => {
		it('should work with No config', () => {
			const result_no_labels = Linear.find_ticket_type({}, []);
			const result_labels = Linear.find_ticket_type({}, [{
				id: 'label1',
				name: 'label 1'
			}, {
				id: 'label2',
				name: 'label 2',
				parentId: 'parent label'
			},]);

			expect(result_no_labels).to.eql('unknown');
			expect(result_labels).to.eql('unknown');
		});

		it('should work with Parent label', () => {
			const result_no_labels = Linear.find_ticket_type({
				parent_label_id: 'parent-label'
			}, []);

			const result_no_matching_label = Linear.find_ticket_type({
				parent_label_id: 'parent-label'
			}, [{
				id: '1234',
				name: 'label 1234',
				parentId: 'parent-label-2'
			}]);

			const result_matching_label = Linear.find_ticket_type({
				parent_label_id: 'parent-label'
			}, [{
				id: '1234',
				name: 'label 1234',
				parentId: 'parent-label-2'
			}, {
				id: '5678',
				name: 'label 5678',
				parentId: 'parent-label'
			}]);

			expect(result_no_labels).to.eql('unknown');
			expect(result_no_matching_label).to.eql('unknown');
			expect(result_matching_label).to.eql('label 5678');
		});

		it('should work with Allow list', () => {
			const result_no_labels = Linear.find_ticket_type({
				allow_list: new Set(['label-1234'])
			}, []);

			const result_no_matching_label = Linear.find_ticket_type({
				allow_list: new Set(['label-1234'])
			}, [{
				id: 'label-1',
				name: 'label-1',
				parentId: 'parent-3456'
			}]);

			const result_matching_label = Linear.find_ticket_type({
				allow_list: new Set(['label-1234'])
			}, [{
				id: 'label1',
				name: 'label-1',
				parentId: 'parent-1231'
			}, {
				id: 'label-1234',
				name: 'label-2',
			}]);

			expect(result_no_labels).to.eql('unknown');
			expect(result_no_matching_label).to.eql('unknown');
			expect(result_matching_label).to.eql('label-2');
		});

		it('Parent id should take precedence', () => {
			const match = Linear.find_ticket_type({
				allow_list: new Set(['parent-1']),
				parent_label_id: 'parent-567'
			}, [{
				parentId: 'parent-1',
				id: 1,
				name: '1'
			}, {
				parentId: 'parent-567',
				id: '1235',
				name: '1235'
			}]);

			expect(match).to.be.eql('1235');
		});
	})
});
