const Crypto = require('node:crypto');
const { expect } = require('chai');
const { create_server } = require('../../src/server');
const { Ticket } = require('../../src/models/ticket');

const server = create_server();

describe('Ticketing', () => {
	describe('Stats', () => {
		describe('No items', () => {
			it('json - should calculate 6 months on its own if no dates are passed', () => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/ticketing/stats',
					payload:{},
				}).then(response => {
					expect(response.statusCode).to.be.eql(200);
					const now = new Date();
					const body = JSON.parse(response.body);

					const from_date = new Date(body.from);
					const to_date = new Date(body.to);

					// Now will always be "in the future"
					// since we take 6 months and we remove "extra dates"
					// So for example 5th September minus 6 months = 5march
					// but we make it to 1 march, and we add back 6 motnhs -> 1st sept
					expect(now).to.be.above(from_date);
					expect(now).to.be.above(to_date);
					// 180 days in ms
					expect(to_date.getTime() - from_date.getTime()).to.be.above(15_552_000_000);
					expect(body.summary).to.be.eql({});
				});
			});

			it('json - should return empty stats', () => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/ticketing/stats',
					payload:{
						from: '2025-01-01T00:00:00.000Z',
						to: '2025-07-01T00:00:00.000Z'
					},
				}).then(response => {
					expect(response.statusCode).to.be.eql(200);
					expect(JSON.parse(response.body)).to.be.eql({
						from: '2025-01-01T00:00:00.000Z',
						to: '2025-07-01T00:00:00.000Z',
						summary: {}
					});
				});
			});

			it('csv - should return empty stats', () => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/ticketing/stats?format=csv',
					payload:{
						from: '2025-01-01T00:00:00.000Z',
						to: '2025-07-01T00:00:00.000Z'
					},
				}).then(response => {
					expect(response.statusCode).to.be.eql(200);
					expect(response.body).to.be.eql('');
				});
			});
		});

		describe('With tickets', () => {
			beforeEach(() => {
				const actor3_hash = 'kaEiaT74PDPVd5IKjY3l8AOzqzFdqxviACYoYXDJlNk=';
				// Create tickets for ~3 months in 2024 and various projects/users
				// + empty start dates or end dates
				const tickets = [
					// should be ignored
					new Ticket({
						id: Crypto.randomUUID(),
						team_id: 'team-1',
						project_id: 'project-1',
						created_at: '2023-12-31T12:54:00.000Z',
						started_at: '2023-12-31T10:00:00.000Z',
						finished_at: '2023-12-31T12:30:00.000Z',
						actor_hash: 'actor-1',
						current_estimation: 3
					}),
					// *******
					// 2024-01
					// *******
					// Should count
					new Ticket({
						id: Crypto.randomUUID(),
						team_id: 'team-1',
						project_id: 'project-1',
						created_at: '2024-01-14T12:54:00.000Z',
						started_at: '2024-01-15T10:00:00.000Z',
						finished_at: '2024-01-16T09:30:00.000Z',
						actor_hash: actor3_hash,
						current_estimation: 8
					}),
					// This one should be ignored because finished
					// waaaay into the future
					new Ticket({
						id: Crypto.randomUUID(),
						team_id: 'team-1',
						project_id: 'project-1',
						created_at: '2024-01-14T12:54:00.000Z',
						started_at: '2024-01-15T10:00:00.000Z',
						finished_at: '2025-01-16T09:30:00.000Z',
						actor_hash: actor3_hash,
						current_estimation: 123
					}),
					new Ticket({
						id: Crypto.randomUUID(),
						team_id: 'team-1',
						project_id: 'project-1',
						created_at: '2024-01-01T12:54:00.000Z',
						started_at: '2024-01-02T10:00:00.000Z',
						finished_at: '2024-01-02T12:30:00.000Z',
						actor_hash: 'actor-1',
						current_estimation: 3
					}),
					new Ticket({
						id: Crypto.randomUUID(),
						team_id: 'team-1',
						project_id: 'project-1',
						created_at: '2024-01-01T12:55:00.000Z',
						started_at: '2024-01-02T09:00:00.000Z',
						finished_at: '2024-01-02T09:15:00.000Z',
						actor_hash: 'actor-2',
						current_estimation: 1
					}),
					new Ticket({
						id: Crypto.randomUUID(),
						team_id: 'team-1',
						project_id: 'project-2',
						created_at: '2024-01-01T12:55:00.000Z',
						started_at: '2024-01-02T09:30:00.000Z',
						finished_at: '2024-01-02T11:30:00.000Z',
						actor_hash: 'actor-2',
						current_estimation: 3
					}),
					// *******
					// 2024-02
					// *******
					// should be ignored because not finished
					new Ticket({
						id: Crypto.randomUUID(),
						team_id: 'team-1',
						project_id: 'project-2',
						created_at: '2024-02-01T12:55:00.000Z',
						started_at: '2024-02-02T09:00:00.000Z',
						finished_at: null,
						actor_hash: actor3_hash,
						current_estimation: 15
					}),
					new Ticket({
						id: Crypto.randomUUID(),
						team_id: 'team-1',
						project_id: 'project-2',
						created_at: '2024-02-01T12:55:00.000Z',
						started_at: '2024-02-03T09:00:00.000Z',
						finished_at: '2024-02-03T15:00:00.000Z',
						actor_hash: 'actor-1',
						current_estimation: 5
					}),
					new Ticket({
						id: Crypto.randomUUID(),
						team_id: 'team-1',
						project_id: 'project-2',
						created_at: '2024-02-01T12:55:00.000Z',
						started_at: null,
						finished_at: '2024-02-05T10:00:00.000Z',
						actor_hash: actor3_hash,
						current_estimation: 8
					}),
					new Ticket({
						id: Crypto.randomUUID(),
						team_id: 'team-1',
						project_id: 'project-2',
						created_at: '2024-02-01T12:55:00.000Z',
						started_at: null,
						finished_at: '2024-02-04T11:30:00.000Z',
						actor_hash: 'actor-2',
						current_estimation: 2
					}),
					// *******
					// 2024-03
					// *******
					new Ticket({
						id: Crypto.randomUUID(),
						team_id: 'team-1',
						project_id: 'project-X',
						created_at: '2024-03-14T12:00:00.000Z',
						started_at: null,
						finished_at: '2024-03-16T12:00:00.000Z',
						actor_hash: actor3_hash,
						current_estimation: 13
					}),
					// *******
					// 2025-02
					// *******
					// should be ignored
					new Ticket({
						id: Crypto.randomUUID(),
						team_id: 'team-1',
						project_id: 'project-2',
						created_at: '2025-02-01T12:55:00.000Z',
						started_at: null,
						finished_at: '2025-02-04T11:30:00.000Z',
						actor_hash: 'actor-2',
						current_estimation: 2
					}),
				];

				return Ticket.objects.insert(tickets);
			});

			it('should return a ticket summary -- full test', () => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/ticketing/stats',
					payload:{
						from: '2024-01-01T00:00:00.000Z',
						to: '2024-04-01T00:00:00.000Z',
						unhash_actors: ['actor-3@gmail.com']
					},
				}).then(response => {
					expect(response.statusCode).to.be.eql(200);
					expect(JSON.parse(response.body)).to.be.eql({
						from: '2024-01-01T00:00:00.000Z',
						to: '2024-04-01T00:00:00.000Z',
						summary: {
							'2024-01-01': {
								by_actor: {
									'actor-1': {
										actor_monthly_estimation: 3,
										actor_monthly_ticket_count: 1,
										actor_monthly_time: 9_000,
										projects: {
											'project-1': {
												actor_monthly_project_ticket_count: 1,
												actor_monthly_project_ticket_percent: 1,
												sum_month_project_estimation: 3,
												percent_month_project_estimation: 1,
												sum_month_project_time_spent_seconds: 9_000,
												percent_month_project_time_spent_seconds: 1,
											}
										}
									},
									'actor-2': {
										actor_monthly_estimation: 4,
										actor_monthly_ticket_count: 2,
										actor_monthly_time: 8_100,
										projects: {
											'project-1': {
												actor_monthly_project_ticket_count: 1,
												actor_monthly_project_ticket_percent: 0.5,
												sum_month_project_estimation: 1,
												percent_month_project_estimation: 0.25,
												sum_month_project_time_spent_seconds: 900,
												percent_month_project_time_spent_seconds: 0.1111111111111111,
											},
											'project-2': {
												actor_monthly_project_ticket_count: 1,
												actor_monthly_project_ticket_percent: 0.5,
												sum_month_project_estimation: 3,
												percent_month_project_estimation: 0.75,
												sum_month_project_time_spent_seconds: 7_200,
												percent_month_project_time_spent_seconds: 0.8888888888888888,
											},
										}
									},
									'actor-3@gmail.com': {
										actor_monthly_estimation: 8,
										actor_monthly_ticket_count: 1,
										actor_monthly_time: 84_600,
										projects: {
											'project-1': {
												actor_monthly_project_ticket_count: 1,
												actor_monthly_project_ticket_percent: 1,
												sum_month_project_estimation: 8,
												percent_month_project_estimation: 1,
												sum_month_project_time_spent_seconds: 84_600,
												percent_month_project_time_spent_seconds: 1,
											}
										}
									}
								},
							},
							'2024-02-01': {
								by_actor: {
									'actor-1': {
										actor_monthly_estimation: 5,
										actor_monthly_ticket_count: 1,
										actor_monthly_time: 21_600,
										projects: {
											'project-2': {
												actor_monthly_project_ticket_count: 1,
												actor_monthly_project_ticket_percent: 1,
												sum_month_project_estimation: 5,
												percent_month_project_estimation: 1,
												sum_month_project_time_spent_seconds: 21_600,
												percent_month_project_time_spent_seconds: 1,
											}
										}
									},
									'actor-2': {
										actor_monthly_estimation: 2,
										actor_monthly_ticket_count: 1,
										actor_monthly_time: 254_100,
										projects: {
											'project-2': {
												actor_monthly_project_ticket_count: 1,
												actor_monthly_project_ticket_percent: 1,
												sum_month_project_estimation: 2,
												percent_month_project_estimation: 1,
												sum_month_project_time_spent_seconds: 254_100,
												percent_month_project_time_spent_seconds: 1,
											}
										}
									},
									'actor-3@gmail.com': {
										actor_monthly_estimation: 8,
										actor_monthly_ticket_count: 1,
										actor_monthly_time: 335_100,
										projects: {
											'project-2': {
												actor_monthly_project_ticket_count: 1,
												actor_monthly_project_ticket_percent: 1,
												sum_month_project_estimation: 8,
												percent_month_project_estimation: 1,
												sum_month_project_time_spent_seconds: 335_100,
												percent_month_project_time_spent_seconds: 1,
											}
										}
									}
								},
							},
							'2024-03-01': {
								by_actor: {
									'actor-3@gmail.com': {
										actor_monthly_estimation: 13,
										actor_monthly_ticket_count: 1,
										actor_monthly_time: 172_800,
										projects: {
											'project-X': {
												actor_monthly_project_ticket_count: 1,
												actor_monthly_project_ticket_percent: 1,
												sum_month_project_estimation: 13,
												percent_month_project_estimation: 1,
												sum_month_project_time_spent_seconds: 172_800,
												percent_month_project_time_spent_seconds: 1,
											}
										}
									}
								},
							},
						}
					});
				});
			});

			it('should return a list in CSV format', () => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/ticketing/stats?format=csv',
					payload:{
						from: '2024-01-01T00:00:00.000Z',
						to: '2024-04-01T00:00:00.000Z',
					},
				}).then(response => {
					expect(response.statusCode).to.be.eql(200);
					expect(response.body).to.be.eql('' +
						'actor_monthly_ticket_count,actor_monthly_project_ticket_count,actor_monthly_project_ticket_percent,actor_hash,actor_monthly_estimation,actor_monthly_time,project_id,month,sum_month_project_estimation,percent_month_project_estimation,sum_month_project_time_spent_seconds,percent_month_project_time_spent_seconds\n' +
						'1,1,1,actor-1,3,9000,project-1,2024-01-01,3,1,9000,1\n' +
						'2,1,0.5,actor-2,4,8100,project-1,2024-01-01,1,0.25,900,0.1111111111111111\n' +
						'1,1,1,kaEiaT74PDPVd5IKjY3l8AOzqzFdqxviACYoYXDJlNk=,8,84600,project-1,2024-01-01,8,1,84600,1\n' +
						'2,1,0.5,actor-2,4,8100,project-2,2024-01-01,3,0.75,7200,0.8888888888888888\n' +
						'1,1,1,actor-1,5,21600,project-2,2024-02-01,5,1,21600,1\n' +
						'1,1,1,actor-2,2,254100,project-2,2024-02-01,2,1,254100,1\n' +
						'1,1,1,kaEiaT74PDPVd5IKjY3l8AOzqzFdqxviACYoYXDJlNk=,8,335100,project-2,2024-02-01,8,1,335100,1\n' +
						'1,1,1,kaEiaT74PDPVd5IKjY3l8AOzqzFdqxviACYoYXDJlNk=,13,172800,project-X,2024-03-01,13,1,172800,1\n'
					);
				});
			});
		});
	});
});
