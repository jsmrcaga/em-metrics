const fs = require('node:fs');
const path = require('node:path');

const sinon = require('sinon');
const { expect } = require('chai');

const { Config } = require('../../../src/config');
const { GitHub } = require('../../../src/integrations/github/github');
const { GitHubAppClient } = require('../../../src/integrations/github/api/github-app-client');
const { create_server } = require('../../../src/server');
const { PullRequest } = require('../../../src/models/pull-request');

const {
	pull_request_opened_count,
	pull_request_closed_count,
	pull_request_merged_count,
	pull_request_loc_added,
	pull_request_loc_removed,
	pull_request_nb_reviews_per_pr,
	pull_request_nb_comments_per_review,
	pull_request_time_to_first_review_minutes,
	pull_request_time_to_approve_minutes,
	pull_request_time_to_merge_minutes,
} = require('../../../src/metrics/core4/pull-requests');

const {
	get_pull_request_event,
	get_pr_review_event
} = require('./utils/github.utils');

const PULL_REQUEST_ID = '123123123';

describe('Webhooks - Github', () => {
	let github_validate_webhook_stub;

	let ticket_count_stub;
	let time_per_ticket_stub;

	const config = new Config();
	config.init({
		teams: {
			'fake-team': {
				users: [{
					github_username: 'jsmrcaga'
				}]
			}
		}
	});

	const server = create_server(config);

	let github_api_stub;

	let pull_request_opened_count_stub;
	let pull_request_closed_count_stub;
	let pull_request_merged_count_stub;
	let pull_request_loc_added_stub;
	let pull_request_loc_removed_stub;
	let pull_request_nb_reviews_per_pr_stub;
	let pull_request_nb_comments_per_review_stub;
	let pull_request_time_to_first_review_minutes_stub;
	let pull_request_time_to_approve_minutes_stub;
	let pull_request_time_to_merge_minutes_stub;

	function expect_metrics_ignored() {
		// validate prometheus events
		expect(pull_request_opened_count_stub.callCount).to.be.eql(0);
		expect(pull_request_loc_added_stub.callCount).to.be.eql(0);
		expect(pull_request_loc_removed_stub.callCount).to.be.eql(0);
		expect(pull_request_closed_count_stub.callCount).to.be.eql(0);
		expect(pull_request_merged_count_stub.callCount).to.be.eql(0);
		expect(pull_request_nb_reviews_per_pr_stub.callCount).to.be.eql(0);
		expect(pull_request_nb_comments_per_review_stub.callCount).to.be.eql(0);
		expect(pull_request_time_to_first_review_minutes_stub.callCount).to.be.eql(0);
		expect(pull_request_time_to_approve_minutes_stub.callCount).to.be.eql(0);
		expect(pull_request_time_to_merge_minutes_stub.callCount).to.be.eql(0);
	}

	beforeEach(() => {
		// Unblock webhook creation
		github_validate_webhook_stub = sinon.stub(GitHub.prototype, 'validate_webhook');
		github_validate_webhook_stub.callsFake(() => true);

		// Prometheus
		pull_request_opened_count_stub = sinon.stub(pull_request_opened_count, 'increment');
		pull_request_closed_count_stub = sinon.stub(pull_request_closed_count, 'increment');
		pull_request_merged_count_stub = sinon.stub(pull_request_merged_count, 'increment');
		pull_request_loc_added_stub = sinon.stub(pull_request_loc_added, 'record');
		pull_request_loc_removed_stub = sinon.stub(pull_request_loc_removed, 'record');
		pull_request_nb_reviews_per_pr_stub = sinon.stub(pull_request_nb_reviews_per_pr, 'record');
		pull_request_nb_comments_per_review_stub = sinon.stub(pull_request_nb_comments_per_review, 'record');
		pull_request_time_to_first_review_minutes_stub = sinon.stub(pull_request_time_to_first_review_minutes, 'record');
		pull_request_time_to_approve_minutes_stub = sinon.stub(pull_request_time_to_approve_minutes, 'record');
		pull_request_time_to_merge_minutes_stub = sinon.stub(pull_request_time_to_merge_minutes, 'record');

		// API
		github_api_stub = sinon.stub(GitHubAppClient.prototype, 'raw_request');
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('Signature', () => {
		beforeEach(() => {
			// Restore the validate_webhook for this test
			github_validate_webhook_stub.restore();
		});

		it('should validate the signature from the webhook', () => {
			const file = fs.readFileSync(path.join(__dirname, './utils/github-events/signature-check.raw-json'));

			const github = new GitHub({
				webhook_secret: process.env.GITHUB_SECRET,
			});

			expect(() => {
				github.validate_webhook(file, {
					// Taken from a real event
					'X-Hub-Signature-256': 'sha256=fa4e637ffdb6db72312f2b6b111595dcce287ea90384a2feebdeb74a1c224676'
				});
			}).to.not.throw();
		});
	});

	describe('Pull Requests', () => {
		describe('PR ignored events', () => {
			describe('PR events', () => {
				for(const event of ['assigned', 'auto_merge_enabled', 'edited', 'labeled', 'ready_for_review', 'synchronize']) {
					it(`should ignore pr::${event} events`, () => {
						return server.inject({
							path: '/webhooks/github',
							method: 'POST',
							payload: get_pull_request_event({
								action: 'edited',
								pull_request: {
									id: PULL_REQUEST_ID,
								}
							}),
							headers: {
								'X-Hub-Signature-256': 'asdasda',
								'X-GitHub-Event': 'pull_request'
							}
						}).then(res => {
							expect(res.statusCode).to.be.eql(200);
							expect_metrics_ignored();
						});
					});
				}
			});

			describe('Teams', () => {
				it('should ignore an event made by an unknown user', () => {
					return server.inject({
						path: '/webhooks/github',
						method: 'POST',
						payload: get_pull_request_event({
							action: 'edited',
							pull_request: {
								id: PULL_REQUEST_ID,
								user: {
									...get_pull_request_event().pull_request.user,
									login: 'unknown-user'
								}
							}
						}),
						headers: {
							'X-Hub-Signature-256': 'asdasda',
							'X-GitHub-Event': 'pull_request'
						}
					}).then(res => {
						expect(res.statusCode).to.be.eql(200);
						expect_metrics_ignored();					});
				});
			});
		});

		describe('PR created', () => {
			it('should handle a PR created webhook', () => {
				return server.inject({
					path: '/webhooks/github',
					method: 'POST',
					payload: get_pull_request_event({
						action: 'opened',
						pull_request: {
							id: PULL_REQUEST_ID,
							created_at: '2022-01-01T00:00:00.000Z',
							additions: 115,
							deletions: 56
						}
					}),
					headers: {
						'X-Hub-Signature-256': 'asdasda',
						'X-GitHub-Event': 'pull_request'
					}
				}).then(res => {
					expect(res.statusCode).to.be.eql(200);

					// validate prometheus events
					expect(pull_request_opened_count_stub.callCount).to.be.eql(1);
					expect(pull_request_loc_added_stub.firstCall.args).to.be.eql([115, { team_id: 'fake-team' }]);
					expect(pull_request_loc_removed_stub.firstCall.args).to.be.eql([56, { team_id: 'fake-team' }]);

					expect(pull_request_closed_count_stub.callCount).to.be.eql(0);
					expect(pull_request_merged_count_stub.callCount).to.be.eql(0);
					expect(pull_request_nb_reviews_per_pr_stub.callCount).to.be.eql(0);
					expect(pull_request_nb_comments_per_review_stub.callCount).to.be.eql(0);
					expect(pull_request_time_to_first_review_minutes_stub.callCount).to.be.eql(0);
					expect(pull_request_time_to_approve_minutes_stub.callCount).to.be.eql(0);
					expect(pull_request_time_to_merge_minutes_stub.callCount).to.be.eql(0);
				});
			});
		});

		describe('PR merged', () => {
			beforeEach(() => {
				// create PR
				const pr = new PullRequest({
					id: PULL_REQUEST_ID,
					team_id: 'test-team',
					opened_at: '2022-01-01T00:00:00.000Z'
				});

				return PullRequest.objects.insert(pr);
			});

			it('should handle a PR merged webhook', () => {
				return server.inject({
					path: '/webhooks/github',
					method: 'POST',
					payload: get_pull_request_event({
						action: 'closed',
						pull_request: {
							id: PULL_REQUEST_ID,
							created_at: '2022-01-01T00:00:00.000Z',
							merged: true,
							merged_at: '2022-01-02T00:00:00.000Z',
							closed_at: null
						}
					}),
					headers: {
						'X-Hub-Signature-256': 'asdasda',
						'X-GitHub-Event': 'pull_request'
					}
				}).then(res => {
					expect(res.statusCode).to.be.eql(200);

					// validate prometheus events
					expect(pull_request_opened_count_stub.callCount).to.be.eql(0);
					expect(pull_request_loc_added_stub.callCount).to.be.eql(0);
					expect(pull_request_loc_removed_stub.callCount).to.be.eql(0);

					expect(pull_request_merged_count_stub.callCount).to.be.eql(1);
					// uses the team already in the PR object
					expect(pull_request_time_to_merge_minutes_stub.firstCall.args).to.be.eql([1_440, { team_id: 'test-team' }]);
					// We store the nb of reviews from the DB
					expect(pull_request_nb_reviews_per_pr_stub.firstCall.args).to.be.eql([0, { team_id: 'test-team' }]);

					expect(pull_request_closed_count_stub.callCount).to.be.eql(0);
					expect(pull_request_nb_comments_per_review_stub.callCount).to.be.eql(0);
					expect(pull_request_time_to_first_review_minutes_stub.callCount).to.be.eql(0);
					expect(pull_request_time_to_approve_minutes_stub.callCount).to.be.eql(0);
				});
			});
		});

		describe('PR closed', () => {
			beforeEach(() => {
				// create PR
				const pr = new PullRequest({
					id: PULL_REQUEST_ID,
					team_id: 'test-team',
					opened_at: '2022-01-01T00:00:00.000Z'
				});

				return PullRequest.objects.insert(pr);
			});

			it('should handle a PR closed webhook', () => {
				return server.inject({
					path: '/webhooks/github',
					method: 'POST',
					payload: get_pull_request_event({
						action: 'closed',
						pull_request: {
							id: PULL_REQUEST_ID,
							merged: false,
							created_at: '2022-01-01T00:00:00.000Z',
							merged_at: '2022-01-02T00:00:00.000Z',
							closed_at: '2022-01-03T00:00:00.000Z',
						}
					}),
					headers: {
						'X-Hub-Signature-256': 'asdasda',
						'X-GitHub-Event': 'pull_request'
					}
				}).then(res => {
					expect(res.statusCode).to.be.eql(200);

					// validate prometheus events
					expect(pull_request_opened_count_stub.callCount).to.be.eql(0);
					expect(pull_request_loc_added_stub.callCount).to.be.eql(0);
					expect(pull_request_loc_removed_stub.callCount).to.be.eql(0);

					expect(pull_request_merged_count_stub.callCount).to.be.eql(0);
					expect(pull_request_time_to_merge_minutes_stub.callCount).to.be.eql(0);
					expect(pull_request_nb_reviews_per_pr_stub.callCount).to.be.eql(0);
					expect(pull_request_nb_comments_per_review_stub.callCount).to.be.eql(0);
					expect(pull_request_time_to_first_review_minutes_stub.callCount).to.be.eql(0);
					expect(pull_request_time_to_approve_minutes_stub.callCount).to.be.eql(0);

					expect(pull_request_closed_count_stub.firstCall.args).to.be.eql([{ team_id: 'test-team' }]);
				});
			});
		});
	});

	describe('Pull Request Review', () => {
		beforeEach(() => {
			// create PR
			const pr = new PullRequest({
				id: PULL_REQUEST_ID,
				team_id: 'chicken-team',
				opened_at: '2022-01-01T00:00:00.000Z'
			});

			return PullRequest.objects.insert(pr);
		});

		describe('Ignored events', () => {

			describe('Ignored users', () => {
				it(`should ignore review events if the PR author is not accepted`, () => {
					const event = get_pr_review_event('approved');

					event.pull_request.user.login = 'user-not-allowed';

					return server.inject({
						path: '/webhooks/github',
						method: 'POST',
						payload: event,
						headers: {
							'X-Hub-Signature-256': 'asdasda',
							'X-GitHub-Event': 'pull_request_review'
						}
					}).then(res => {
						expect(res.statusCode).to.be.eql(200);
						expect_metrics_ignored();
					});
				});
			});

			describe('Ignored actions', () => {
				for(const event of ['dismissed', 'edited']) {
					it(`should ignore review::${event} events`, () => {
						return server.inject({
							path: '/webhooks/github',
							method: 'POST',
							payload: get_pr_review_event('approved', {
								action: event
							}),
							headers: {
								'X-Hub-Signature-256': 'asdasda',
								'X-GitHub-Event': 'pull_request_review'
							}
						}).then(res => {
							expect(res.statusCode).to.be.eql(200);
							expect_metrics_ignored();
						});
					});
				}
			});

			describe('Ignored Review states', () => {
				// submitted is ignored because it's triggered
				// every time someone clicks on "Add single comment"
				// @see https://stackoverflow.com/questions/49145734/what-are-all-possible-github-pull-request-review-statuses
				for(const review_state of ['dismissed', 'pending']) {
					it(`should ignore review::submitted::${review_state} events`, () => {
						return server.inject({
							path: '/webhooks/github',
							method: 'POST',
							payload: get_pr_review_event('approved', {
								review: {
									state: review_state
								}
							}),
							headers: {
								'X-Hub-Signature-256': 'asdasda',
								'X-GitHub-Event': 'pull_request_review'
							}
						}).then(res => {
							expect(res.statusCode).to.be.eql(200);
							expect_metrics_ignored();
						});
					});
				}
			});
		});

		describe('Accepted events', () => {
			beforeEach(() => {
				// jwt
				github_api_stub.onCall(0).callsFake(() => {
					return Promise.resolve({ data: { token: 'github-access-token', expires_at: '2054-01-01' }});
				});

				github_api_stub.onCall(1).callsFake(() => {
					return Promise.resolve({
						data: [1, 2, 3, 4]
					});
				});

				GitHubAppClient.reset_cache();
			});

			describe('Review - Commented', () => {
				it(`should mark the PR as reviewed once when commented`, () => {
					return server.inject({
						path: '/webhooks/github',
						method: 'POST',
						payload: get_pr_review_event('commented', {
							pull_request: {
								id: PULL_REQUEST_ID,
							},
							review: {
								// PR opened at '2022-01-01T00:00:00.000Z'
								submitted_at: '2022-01-01T01:15:00.000Z'
							}
						}),
						headers: {
							'X-Hub-Signature-256': 'asdasda',
							'X-GitHub-Event': 'pull_request_review'
						}
					}).then(res => {
						expect(res.statusCode).to.be.eql(200);

						expect(pull_request_opened_count_stub.callCount).to.be.eql(0);
						expect(pull_request_loc_added_stub.callCount).to.be.eql(0);
						expect(pull_request_loc_removed_stub.callCount).to.be.eql(0);

						expect(pull_request_merged_count_stub.callCount).to.be.eql(0);
						expect(pull_request_time_to_merge_minutes_stub.callCount).to.be.eql(0);
						expect(pull_request_nb_reviews_per_pr_stub.callCount).to.be.eql(0);

						expect(pull_request_nb_comments_per_review_stub.firstCall.args).to.be.eql([4, {
							team_id: 'chicken-team'
						}]);
						expect(pull_request_time_to_first_review_minutes_stub.firstCall.args).to.be.eql([75, {
							team_id: 'chicken-team'
						}]);
						expect(pull_request_time_to_approve_minutes_stub.callCount).to.be.eql(0);
						expect(pull_request_closed_count_stub.callCount).to.be.eql(0);
					});
				});

				it(`should ignore a comment if made by the pr author`, () => {
					return server.inject({
						path: '/webhooks/github',
						method: 'POST',
						payload: get_pr_review_event('commented', {
							pull_request: {
								id: PULL_REQUEST_ID,
								user: {
									login: 'user-1'
								}
							},
							review: {
								// PR opened at '2022-01-01T00:00:00.000Z'
								submitted_at: '2022-01-01T01:15:00.000Z',
								user: {
									login: 'user-1'
								}
							}
						}),
						headers: {
							'X-Hub-Signature-256': 'asdasda',
							'X-GitHub-Event': 'pull_request_review'
						}
					}).then(res => {
						expect(res.statusCode).to.be.eql(200);

						expect(pull_request_opened_count_stub.callCount).to.be.eql(0);
						expect(pull_request_loc_added_stub.callCount).to.be.eql(0);
						expect(pull_request_loc_removed_stub.callCount).to.be.eql(0);

						expect(pull_request_merged_count_stub.callCount).to.be.eql(0);
						expect(pull_request_time_to_merge_minutes_stub.callCount).to.be.eql(0);
						expect(pull_request_nb_reviews_per_pr_stub.callCount).to.be.eql(0);

						expect(pull_request_nb_comments_per_review_stub.callCount).to.be.eql(0);
						expect(pull_request_time_to_first_review_minutes_stub.callCount).to.be.eql(0);
						expect(pull_request_time_to_approve_minutes_stub.callCount).to.be.eql(0);
						expect(pull_request_closed_count_stub.callCount).to.be.eql(0);
					});
				});
			});

			describe('Review - Approved', () => {
				const PRE_REVIEWED_PR_ID = '983645892';
				beforeEach(() => {
					const pr = new PullRequest({
						id: PRE_REVIEWED_PR_ID,
						team_id: 'chicken-team',
						opened_at: '2022-01-01T00:00:00.000Z',
						first_review_at: '2022-01-01T01:15:00.000Z'
					});

					return PullRequest.objects.insert(pr);
				});

				it(`should mark the PR as approved once when commented`, () => {
					return server.inject({
						path: '/webhooks/github',
						method: 'POST',
						payload: get_pr_review_event('approved', {
							pull_request: {
								id: PULL_REQUEST_ID,
								user: {
									login: 'jsmrcaga'
								}
							},
							review: {
								// PR opened at '2022-01-01T00:00:00.000Z'
								submitted_at: '2022-01-01T01:15:00.000Z'
							}
						}),
						headers: {
							'X-Hub-Signature-256': 'asdasda',
							'X-GitHub-Event': 'pull_request_review'
						}
					}).then(res => {
						expect(res.statusCode).to.be.eql(200);

						expect(pull_request_opened_count_stub.callCount).to.be.eql(0);
						expect(pull_request_loc_added_stub.callCount).to.be.eql(0);
						expect(pull_request_loc_removed_stub.callCount).to.be.eql(0);

						expect(pull_request_merged_count_stub.callCount).to.be.eql(0);
						expect(pull_request_time_to_merge_minutes_stub.callCount).to.be.eql(0);
						expect(pull_request_nb_reviews_per_pr_stub.callCount).to.be.eql(0);

						expect(pull_request_nb_comments_per_review_stub.firstCall.args).to.be.eql([4, {
							team_id: 'chicken-team'
						}]);
						expect(pull_request_time_to_first_review_minutes_stub.firstCall.args).to.be.eql([75, {
							team_id: 'chicken-team'
						}]);
						// in this case "just happens to be the same" as first review
						expect(pull_request_time_to_approve_minutes_stub.firstCall.args).to.be.eql([75, {
							team_id: 'chicken-team'
						}]);
						expect(pull_request_closed_count_stub.callCount).to.be.eql(0);
					});
				});

				it(`should mark an already reviewed PR as approved once approved`, () => {
					return server.inject({
						path: '/webhooks/github',
						method: 'POST',
						payload: get_pr_review_event('approved', {
							pull_request: {
								id: PRE_REVIEWED_PR_ID,
								user: {
									login: 'jsmrcaga'
								}
							},
							review: {
								// PR opened at '2022-01-01T00:00:00.000Z'
								submitted_at: '2022-01-01T01:30:00.000Z'
							}
						}),
						headers: {
							'X-Hub-Signature-256': 'asdasda',
							'X-GitHub-Event': 'pull_request_review'
						}
					}).then(res => {
						expect(res.statusCode).to.be.eql(200);

						expect(pull_request_opened_count_stub.callCount).to.be.eql(0);
						expect(pull_request_loc_added_stub.callCount).to.be.eql(0);
						expect(pull_request_loc_removed_stub.callCount).to.be.eql(0);

						expect(pull_request_merged_count_stub.callCount).to.be.eql(0);
						expect(pull_request_time_to_merge_minutes_stub.callCount).to.be.eql(0);
						expect(pull_request_nb_reviews_per_pr_stub.callCount).to.be.eql(0);

						expect(pull_request_nb_comments_per_review_stub.firstCall.args).to.be.eql([4, {
							team_id: 'chicken-team'
						}]);
						expect(pull_request_time_to_first_review_minutes_stub.callCount).to.be.eql(0);
						expect(pull_request_time_to_approve_minutes_stub.firstCall.args).to.be.eql([90, {
							team_id: 'chicken-team'
						}]);
						expect(pull_request_closed_count_stub.callCount).to.be.eql(0);
					});
				});
			});

			describe('Review - Changes requested', () => {
				it(`should mark the PR as approved once approved`, () => {
					return server.inject({
						path: '/webhooks/github',
						method: 'POST',
						payload: get_pr_review_event('changes_requested', {
							pull_request: {
								id: PULL_REQUEST_ID,
							},
							review: {
								// PR opened at '2022-01-01T00:00:00.000Z'
								submitted_at: '2022-01-01T01:35:00.000Z'
							}
						}),
						headers: {
							'X-Hub-Signature-256': 'asdasda',
							'X-GitHub-Event': 'pull_request_review'
						}
					}).then(res => {
						expect(res.statusCode).to.be.eql(200);

						expect(pull_request_opened_count_stub.callCount).to.be.eql(0);
						expect(pull_request_loc_added_stub.callCount).to.be.eql(0);
						expect(pull_request_loc_removed_stub.callCount).to.be.eql(0);

						expect(pull_request_merged_count_stub.callCount).to.be.eql(0);
						expect(pull_request_time_to_merge_minutes_stub.callCount).to.be.eql(0);
						expect(pull_request_nb_reviews_per_pr_stub.callCount).to.be.eql(0);

						expect(pull_request_nb_comments_per_review_stub.firstCall.args).to.be.eql([4, {
							team_id: 'chicken-team'
						}]);
						expect(pull_request_time_to_first_review_minutes_stub.firstCall.args).to.be.eql([95, {
							team_id: 'chicken-team'
						}]);
						expect(pull_request_time_to_approve_minutes_stub.callCount).to.be.eql(0);
						expect(pull_request_closed_count_stub.callCount).to.be.eql(0);
					});
				});
			});
		});
	});
});
