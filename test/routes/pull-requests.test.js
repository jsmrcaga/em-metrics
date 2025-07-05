const sinon = require('sinon');
const { expect } = require('chai');

const { create_server } = require('../../src/server');

const { PullRequest } = require('../../src/models/pull-request');

const server = create_server();

const {
	pull_request_opened_count,
	pull_request_closed_count,
	pull_request_merged_count,
	pull_request_loc_added,
	pull_request_loc_removed,
	pull_request_nb_reviews_per_pr,
	pull_request_nb_comments_per_review,
	pull_request_time_to_first_review_minutes,
	pull_request_time_to_merge_minutes,
} = require('../../src/metrics/core4/pull-requests');

describe('Pull Requests', () => {

	let pull_request_opened_count_stub;
	let pull_request_closed_count_stub;
	let pull_request_merged_count_stub;
	let pull_request_loc_added_stub;
	let pull_request_loc_removed_stub;
	let pull_request_nb_reviews_per_pr_stub;
	let pull_request_nb_comments_per_review_stub;
	let pull_request_time_to_first_review_minutes_stub;
	let pull_request_time_to_merge_minutes_stub;

	beforeEach(() => {
		pull_request_opened_count_stub = sinon.stub(pull_request_opened_count, 'increment');
		pull_request_closed_count_stub = sinon.stub(pull_request_closed_count, 'increment');
		pull_request_merged_count_stub = sinon.stub(pull_request_merged_count, 'increment');
		pull_request_loc_added_stub = sinon.stub(pull_request_loc_added, 'record');
		pull_request_loc_removed_stub = sinon.stub(pull_request_loc_removed, 'record');
		pull_request_nb_reviews_per_pr_stub = sinon.stub(pull_request_nb_reviews_per_pr, 'record');
		pull_request_nb_comments_per_review_stub = sinon.stub(pull_request_nb_comments_per_review, 'record');
		pull_request_time_to_first_review_minutes_stub = sinon.stub(pull_request_time_to_first_review_minutes, 'record');
		pull_request_time_to_merge_minutes_stub = sinon.stub(pull_request_time_to_merge_minutes, 'record');
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('Creation', () => {
		it('should create a PR with minimal values', () => {
			return server.inject({
				method: 'POST',
				url: '/api/v1/pull-requests',
				payload: {
					id: 'pr-1',
					team_id: 'team-1'
				}
			}).then(res => {
				expect(res.statusCode).to.be.eql(201);

				expect(pull_request_opened_count_stub.callCount).to.be.eql(1);
				expect(pull_request_opened_count_stub.firstCall.args[0]).to.deep.eql({
					team_id: 'team-1'
				});

				expect(pull_request_loc_added_stub.called).to.be.false;
				expect(pull_request_loc_removed_stub.called).to.be.false;

				return PullRequest.objects.get('pr-1');
			}).then((pr) => {
				expect(pr.id).to.be.eql('pr-1');
				expect(pr.team_id).to.be.eql('team-1');
				expect(pr.opened_at).to.not.be.null;
				expect(pr.closed_at).to.be.null;
				expect(pr.merged_at).to.be.null;
				expect(pr.first_review_at).to.be.null;
				expect(pr.nb_comments).to.be.eql(0);
				expect(pr.nb_reviews).to.be.eql(0);
			});
		});

		it('should force an opening date', () => {
			const opened_at = '2024-01-01T00:10:00.543Z';
			return server.inject({
				method: 'POST',
				url: '/api/v1/pull-requests',
				payload: {
					id: 'pr-1',
					team_id: 'team-1',
					opened_at
				}
			}).then(res => {
				expect(res.statusCode).to.be.eql(201);
				return PullRequest.objects.get('pr-1');
			}).then(pr => {
				expect(pr.opened_at).to.be.eql(opened_at);
			});
		});

		it('should send metrics for additions & deletions', () => {
			return server.inject({
				method: 'POST',
				url: '/api/v1/pull-requests',
				payload: {
					id: 'pr-1',
					team_id: 'team-1',
					additions: 1234,
					deletions: 30
				}
			}).then(res => {
				expect(res.statusCode).to.be.eql(201);

				expect(pull_request_opened_count_stub.callCount).to.be.eql(1);
				expect(pull_request_opened_count_stub.firstCall.args[0]).to.deep.eql({
					team_id: 'team-1'
				});

				expect(pull_request_loc_added_stub.callCount).to.be.eql(1);
				expect(pull_request_loc_added_stub.firstCall.args).to.be.deep.eql([1234, {
					team_id: 'team-1'
				}]);
				expect(pull_request_loc_removed_stub.callCount).to.be.eql(1);
				expect(pull_request_loc_removed_stub.firstCall.args).to.be.eql([30, {
					team_id: 'team-1'
				}]);
			});
		});
	});

	describe('Reviews', () => {
		describe('1st review', () => {
			beforeEach(() => {
				const pr = new PullRequest({
					id: 'pr-2',
					team_id: 'team-2',
					opened_at: '2025-03-03T12:43:23.111Z'
				});

				return PullRequest.objects.insert(pr);
			});

			it('should get a 404', () => {
				return server.inject({
					method: 'POST',
					url: '/api/v1/pull-requests/unknown-pr/reviewed',
					payload: {}
				}).then(res => {
					expect(res.statusCode).to.be.eql(404);
				});
			});

			it('should mark a PR as reviewed and send nb_comments metrics', () => {
				return server.inject({
					method: 'POST',
					url: '/api/v1/pull-requests/pr-2/reviewed',
					payload: {}
				}).then(res => {
					expect(res.statusCode).to.be.eql(200);
					expect(res.body.first_review_at).to.not.be.null;

					expect(pull_request_nb_comments_per_review_stub.callCount).to.be.eql(1);
					expect(pull_request_nb_comments_per_review_stub.firstCall.args).to.deep.eql([0, {
						team_id: 'team-2'
					}]);

					expect(pull_request_time_to_first_review_minutes_stub.callCount).to.be.eql(1);

					return PullRequest.objects.get('pr-2');
				}).then(pr => {
					expect(pr.first_review_at).to.not.be.null;
				});
			});

			it('should mark a PR as reviewed with specific date and send nb_comments metrics', () => {
				const reviewed_at = '2025-03-03T12:45:23.111Z';

				return server.inject({
					method: 'POST',
					url: '/api/v1/pull-requests/pr-2/reviewed',
					payload: {
						reviewed_at,
						nb_comments: 12
					}
				}).then(res => {
					expect(res.statusCode).to.be.eql(200);
					expect(res.body.first_review_at).to.not.be.null;

					expect(pull_request_nb_comments_per_review_stub.callCount).to.be.eql(1);
					expect(pull_request_nb_comments_per_review_stub.firstCall.args).to.deep.eql([12, {
						team_id: 'team-2'
					}]);

					expect(pull_request_time_to_first_review_minutes_stub.callCount).to.be.eql(1);
					expect(pull_request_time_to_first_review_minutes_stub.firstCall.args).to.be.deep.eql([2, {
						team_id: 'team-2'
					}]);

					return PullRequest.objects.get('pr-2');
				}).then(pr => {
					expect(pr.first_review_at).to.not.be.null;
				});
			});
		});

		describe('Subsequent reviews', () => {
			beforeEach(() => {
				const pr = new PullRequest({
					id: 'pr-2',
					team_id: 'team-2',
					opened_at: '2025-03-03T12:43:23.111Z',
					first_review_at: '2025-03-03T13:22:23.111Z'
				});

				return PullRequest.objects.insert(pr);
			});

			it('should send nb_comments metrics', () => {
				return server.inject({
					method: 'POST',
					url: '/api/v1/pull-requests/pr-2/reviewed',
					payload: {
						nb_comments: 2
					}
				}).then(res => {
					expect(res.statusCode).to.be.eql(200);
					expect(res.body.first_review_at).to.not.be.null;

					expect(pull_request_nb_comments_per_review_stub.callCount).to.be.eql(1);
					expect(pull_request_nb_comments_per_review_stub.firstCall.args).to.deep.eql([2, {
						team_id: 'team-2'
					}]);

					expect(pull_request_time_to_first_review_minutes_stub.callCount).to.be.eql(0);
				});
			});
		});
	});

	describe('Closing', () => {
		beforeEach(() => {
			const pr = new PullRequest({
				id: 'pr-3',
				team_id: 'team-3',
				opened_at: '2025-03-03T12:43:23.111Z',
				first_review_at: '2025-03-03T13:22:23.111Z'
			});

			return PullRequest.objects.insert(pr);
		});

		it('should get a 404', () => {
			return server.inject({
				method: 'POST',
				url: '/api/v1/pull-requests/pr-2/closed',
				payload: {}
			}).then(res => {
				expect(res.statusCode).to.be.eql(404);
			});
		});

		it('should mark the pr as closed and increment the counter', () => {
			return server.inject({
				method: 'POST',
				url: '/api/v1/pull-requests/pr-3/closed',
				payload: {
				}
			}).then(res => {
				expect(res.statusCode).to.be.eql(200);
				expect(res.body.closed_at).to.not.be.null;

				expect(pull_request_closed_count_stub.callCount).to.be.eql(1);
				expect(pull_request_closed_count_stub.firstCall.args).to.deep.eql([{
					team_id: 'team-3'
				}]);
			});
		});

		it('should mark the pr as closed on a specific date and increment the counter', () => {
			const closed_at = '2023-04-12T00:00:00.000Z';
			return server.inject({
				method: 'POST',
				url: '/api/v1/pull-requests/pr-3/closed',
				payload: { closed_at }
			}).then(res => {
				expect(res.statusCode).to.be.eql(200);

				expect(pull_request_closed_count_stub.callCount).to.be.eql(1);
				expect(pull_request_closed_count_stub.firstCall.args).to.deep.eql([{
					team_id: 'team-3'
				}]);

				return PullRequest.objects.get('pr-3');
			}).then(pr => {
				expect(pr.closed_at).to.be.eql(closed_at);
			});
		});
	});

	describe('Merging', () => {
		beforeEach(() => {
			const pr = new PullRequest({
				id: 'pr-4',
				team_id: 'team-4',
				opened_at: '2025-03-03T12:43:23.111Z',
				first_review_at: '2025-03-03T13:22:23.111Z',
				nb_reviews: 3
			});

			return PullRequest.objects.insert(pr);
		});

		it('should get a 404', () => {
			return server.inject({
				method: 'POST',
				url: '/api/v1/pull-requests/pr-3/merged',
				payload: {}
			}).then(res => {
				expect(res.statusCode).to.be.eql(404);
			});
		});

		it('should mark the PR as merged and send metrics', () => {
			return server.inject({
				method: 'POST',
				url: '/api/v1/pull-requests/pr-4/merged',
				payload: {}
			}).then(res => {
				expect(res.statusCode).to.be.eql(200);

				return PullRequest.objects.get('pr-4');
			}).then(pr => {
				expect(pr.merged_at).to.not.be.null;

				expect(pull_request_merged_count_stub.callCount).to.be.eql(1);
				expect(pull_request_merged_count_stub.firstCall.args).to.be.eql([{ team_id: 'team-4' }]);

				expect(pull_request_time_to_merge_minutes_stub.callCount).to.be.eql(1);
				
				expect(pull_request_nb_reviews_per_pr_stub.callCount).to.be.eql(1);
				expect(pull_request_nb_reviews_per_pr_stub.firstCall.args).to.be.deep.eql([3, {
					team_id: 'team-4'
				}]);
			});
		});

		it('should mark the PR as merged on a specific date and send metrics', () => {
			return server.inject({
				method: 'POST',
				url: '/api/v1/pull-requests/pr-4/merged',
				payload: {
					merged_at: '2025-03-03T12:53:23.111Z'
				}
			}).then(res => {
				expect(res.statusCode).to.be.eql(200);

				return PullRequest.objects.get('pr-4');
			}).then(pr => {
				expect(pr.merged_at).to.not.be.null;

				expect(pull_request_merged_count_stub.callCount).to.be.eql(1);
				expect(pull_request_merged_count_stub.firstCall.args).to.be.eql([{ team_id: 'team-4' }]);

				expect(pull_request_time_to_merge_minutes_stub.callCount).to.be.eql(1);
				expect(pull_request_time_to_merge_minutes_stub.firstCall.args).to.be.eql([10, {
					team_id: 'team-4'
				}]);
				
				expect(pull_request_nb_reviews_per_pr_stub.callCount).to.be.eql(1);
				expect(pull_request_nb_reviews_per_pr_stub.firstCall.args).to.be.deep.eql([3, {
					team_id: 'team-4'
				}]);
			});
		});
	});
});
