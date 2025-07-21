const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('node:fs');

const { run } = require('../pull-requests');
const { Process } = require('../lib/process');
const { Github } = require('../lib/github');
const { EMAPIClient } = require('../lib/em-api-client');

const {
	mock_github_event,
	clear_github_event_mock
} = require('./lib/mock-github-event');

const {
	mock_env,
	clear_env
} = require('./lib/mock-env');

describe('Pull Requests', () => {
	let process_exit_stub;
	let read_github_event_stub;
	let github_request_stub;
	let em_api_request_stub;

	const env = {
		EM_METRICS_TEAM_ID: 'my-test-team',
		EM_METRICS_ENDPOINT: 'http://em.metrics',
		EM_METRICS_TOKEN: 'secret-test-token',
		GITHUB_TOKEN: 'github-token',
		GITHUB_REPOSITORY: 'myorg/myrepo',
		GITHUB_EVENT_NAME: 'pull_request',
		GITHUB_EVENT_PATH: './event.path',
	};

	beforeEach(() => {
		mock_env(env);

		process_exit_stub = sinon.stub(Process, 'exit');
		read_github_event_stub = sinon.stub(Github.prototype, 'read_event_file');
		github_request_stub = sinon.stub(Github.prototype, 'request').resolves();
		em_api_request_stub = sinon.stub(EMAPIClient.prototype, 'request').resolves();
	});

	afterEach(() => {
		clear_env(env);

		clear_github_event_mock(read_github_event_stub);

		sinon.restore();
	});

	it('should exit on unknown job type', () => {
		// unhandled event
		process.env.GITHUB_EVENT_NAME = 'test-event';
		run();

		expect(process_exit_stub.callCount).to.be.eql(1);
		expect(process_exit_stub.firstCall.args[0]).to.be.eql(0);
	});

	it('should exit on unknown event type', () => {
		read_github_event_stub.callsFake(() => {
			return JSON.stringify({
				action: 'review_requested'
			});
		});

		run();

		expect(process_exit_stub.callCount).to.be.eql(1);
		expect(process_exit_stub.firstCall.args[0]).to.be.eql(0);
	});

	it('should call / when PR is created', () => {
		mock_github_event(read_github_event_stub, 'pull_request', 'opened', {
			pull_request: {
				id: 'pr1',
				created_at: '2025-01-01T00:00:00.000Z',
				additions: 40,
				deletions: 2
			}
		});

		return run().then(() => {
			expect(em_api_request_stub.callCount).to.be.eql(1);
			expect(em_api_request_stub.firstCall.args).to.be.eql([
				'/api/v1/pull-requests',
				{
					method: 'POST',
					body: JSON.stringify({
						id: 'pr1',
						opened_at: '2025-01-01T00:00:00.000Z',
						team_id: env.EM_METRICS_TEAM_ID,
						additions: 40,
						deletions: 2
					})
				}
			]);
		});
	});

	it('should call /merged when PR is merged', () => {
		mock_github_event(read_github_event_stub, 'pull_request', 'closed', {
			pull_request: {
				id: 'pr1',
				created_at: '2025-01-01T00:00:00.000Z',
				merged: true,
				merged_at: '2025-01-03T00:00:00.000Z'
			}
		});

		return run().then(() => {
			expect(em_api_request_stub.callCount).to.be.eql(1);
			expect(em_api_request_stub.firstCall.args).to.be.eql([
				'/api/v1/pull-requests/pr1/merged',
				{
					method: 'POST',
					body: JSON.stringify({
						merged_at: '2025-01-03T00:00:00.000Z'
					})
				}
			]);
		});
	});

	it('should call /closed when PR is closed', () => {
		mock_github_event(read_github_event_stub, 'pull_request', 'closed', {
			pull_request: {
				id: 'pr1',
				created_at: '2025-01-01T00:00:00.000Z',
				merged: false,
				closed_at: '2025-01-06T00:00:00.000Z'
			}
		});

		return run().then(() => {
			expect(em_api_request_stub.callCount).to.be.eql(1);
			expect(em_api_request_stub.firstCall.args).to.be.eql([
				'/api/v1/pull-requests/pr1/closed',
				{
					method: 'POST',
					body: JSON.stringify({
						closed_at: '2025-01-06T00:00:00.000Z'
					})
				}
			]);
		});
	});

	it('should call /reviewed when PR is reviewed', () => {
		mock_github_event(read_github_event_stub, 'pull_request_review', 'submitted', {
			pull_request: {
				id: 'pr1',
				number: 567,
				created_at: '2025-01-01T00:00:00.000Z'
			},
			review: {
				id: 'review-1',
				submitted_at: '2025-01-02T00:00:00.000Z'
			}
		});

		github_request_stub.resolves(['a', 'b', 'c', 'd', 'e']);

		return run().then(() => {
			expect(github_request_stub.callCount).to.be.eql(1);
			expect(github_request_stub.firstCall.args).to.be.eql([
				'/repos/myorg/myrepo/pulls/567/reviews/review-1/comments'
			]);


			expect(em_api_request_stub.callCount).to.be.eql(1);
			expect(em_api_request_stub.firstCall.args).to.be.eql([
				'/api/v1/pull-requests/pr1/reviewed',
				{
					method: 'POST',
					body: JSON.stringify({
						reviewed_at: '2025-01-02T00:00:00.000Z',
						nb_comments: 5
					})
				}
			]);
		});
	});
});
