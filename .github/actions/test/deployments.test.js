const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('node:fs');

const { run } = require('../deployments');
const { Process } = require('../lib/process');
const { EMAPIClient } = require('../lib/em-api-client');


const {
	mock_env,
	clear_env
} = require('./lib/mock-env');

describe('Deployments', () => {
	let process_exit_stub;
	let read_github_event_stub;
	let github_request_stub;
	let em_api_request_stub;

	const env = {
		EM_METRICS_ENDPOINT: 'http://em.metrics',
		INPUT_EM_API_TOKEN: 'secret-test-token',
	};

	beforeEach(() => {
		mock_env(env);

		process_exit_stub = sinon.stub(Process, 'exit');
		em_api_request_stub = sinon.stub(EMAPIClient.prototype, 'request').resolves();
	});

	afterEach(() => {
		clear_env(env);

		sinon.restore();
	});

	it('should exit on unknown deployment type', () => {
		// unhandled event
		process.env.INPUT_DEPLOYMENT_TYPE = 'fake-deployment method';
		return run().then(() => {
			expect(process_exit_stub.callCount).to.be.eql(1);
			expect(process_exit_stub.firstCall.args[0]).to.be.eql(1);
		});
	});

	it('should call / when deployment type is CREATED', () => {
		process.env.INPUT_DEPLOYMENT_TYPE = 'CREATED';
		process.env.INPUT_DEPLOYMENT_ID = 'dep-1';
		process.env.INPUT_PROJECT_ID = 'my-project';
		process.env.INPUT_FIRST_COMMIT_AT = '2025-06-06T00:00:00.000Z';

		return run().then(() => {
			expect(em_api_request_stub.callCount).to.be.eql(1);
			expect(em_api_request_stub.firstCall.args).to.be.eql([
				'/api/v1/deployments',
				{
					method: 'POST',
					body: {
						id: 'dep-1',
						project_id: 'my-project',
						first_commit_at: '2025-06-06T00:00:00.000Z',
					}
				}
			]);
		});
	});

	it('should call /deployed + create when deployment type is DEPLOYED', () => {
		process.env.INPUT_DEPLOYMENT_TYPE = 'DEPLOYED';
		process.env.INPUT_DEPLOYMENT_ID = 'dep-1';
		process.env.INPUT_PROJECT_ID = 'my-project';
		process.env.INPUT_FIRST_COMMIT_AT = '2025-06-06T00:00:00.000Z';

		process.env.INPUT_CREATE_IF_NOT_EXISTS = 'yes';
		process.env.INPUT_DEPLOYMENT_START_TIME = '2025-06-07T00:00:00.000Z';

		return run().then(() => {
			expect(em_api_request_stub.callCount).to.be.eql(1);
			expect(em_api_request_stub.firstCall.args[0]).to.be.eql('/api/v1/deployments/dep-1/deployed');
			expect(em_api_request_stub.firstCall.args[1].method).to.be.eql('POST');
			// All this because chai does not have object matching assertions
			expect(em_api_request_stub.firstCall.args[1].body.id).to.be.eql('dep-1');
			expect(em_api_request_stub.firstCall.args[1].body.project_id).to.be.eql('my-project');
			expect(em_api_request_stub.firstCall.args[1].body.first_commit_at).to.be.eql('2025-06-06T00:00:00.000Z');
			expect(em_api_request_stub.firstCall.args[1].body.deploy_start_at).to.be.eql('2025-06-07T00:00:00.000Z');
			expect(em_api_request_stub.firstCall.args[1].body.create_if_not_exists).to.be.eql(true);
			expect(em_api_request_stub.firstCall.args[1].body.deployed_at).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}/)
		});
	});

	it('should throw when /deployed + create and !deployment_start_time when deployment type is DEPLOYED', () => {
		process.env.INPUT_DEPLOYMENT_TYPE = 'DEPLOYED';
		process.env.INPUT_DEPLOYMENT_ID = 'dep-1';
		process.env.INPUT_PROJECT_ID = 'my-project';
		process.env.INPUT_FIRST_COMMIT_AT = '2025-06-06T00:00:00.000Z';

		process.env.INPUT_CREATE_IF_NOT_EXISTS = 'yes';
		process.env.INPUT_DEPLOYMENT_START_TIME = '';

		return run().then(() => {
			expect(process_exit_stub.callCount).to.be.eql(1);
			expect(process_exit_stub.firstCall.args[0]).to.be.eql(1);
		});
	});
});
