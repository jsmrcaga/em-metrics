const sinon = require('sinon');
const { expect } = require('chai');

const { DORA: { deployment_frequency, lead_time_for_changes }} = require('../../src/metrics');

const { server } = require('../../src/server');
const { Deployment, deployment_duration, deployment_started } = require('../../src/models/deployment');

const PROJECT_ID = 'test-project';


describe('Deployments', () => {
	let deployment_frequency_stub;
	let lead_time_for_changes_stub;
	let deployment_duration_stub;
	let deployment_started_stub;

	beforeEach(() => {
		deployment_frequency_stub = sinon.stub(deployment_frequency, 'increment');
		lead_time_for_changes_stub = sinon.stub(lead_time_for_changes, 'record');
		deployment_duration_stub = sinon.stub(deployment_duration, 'record');
		deployment_started_stub = sinon.stub(deployment_started, 'increment');
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('Create', () => {
		it('should reject a deployment without first_commit_at', () => {
			return server.inject({
				method: 'POST',
				path: '/api/v1/deployments',
				payload: {
					project_id: PROJECT_ID,
					id: 'deployment-1'
				}
			}).then(response => {
				expect(response.statusCode).to.be.eql(400);
				const json = JSON.parse(response.body);
				expect(json).to.have.property('errors');
				expect(json.errors).to.have.length(1);
				expect(json.errors[0].message).to.match(/first_commit_at/);

				return Deployment.objects.all();
			}).then(deployments => {
				expect(deployments).to.have.length(0);
			});
		});

		it('should create a deployment and increment the frequency and lead time for changes', () => {
			return server.inject({
				method: 'POST',
				path: '/api/v1/deployments',
				payload: {
					project_id: PROJECT_ID,
					first_commit_at: '2020-01-01T00:00:00.000Z',
					deployed_at: '2020-01-01T00:10:00.000Z',
					id: 'deployment-1'
				}
			}).then(response => {
				expect(response.statusCode).to.be.eql(201);
				return Deployment.objects.all();
			}).then(deployments => {
				expect(deployments).to.have.length(1);
				const [ deployment ] = deployments;
				expect(deployment.project_id).to.be.eql(PROJECT_ID);

				// metrics
				expect(deployment_started_stub.calledOnce).to.be.true;
				expect(deployment_started_stub.calledWith({
					project_id: PROJECT_ID
				})).to.be.true;
				expect(deployment_frequency_stub.calledOnce).to.be.false;
				expect(lead_time_for_changes_stub.calledOnce).to.be.false;
			});
		});
	});

	describe('Deploy, /deployed', () => {
		describe('when no deployments existed beforehand', () => {
			it('should return 404', () => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/deployments/deployment_1/deployed',
					payload: {
						project_id: 'project-2',
						first_commit_at: '2020-01-01T00:00:00.000Z',
						create_if_not_exists: false
					}
				}).then(response => {
					expect(response.statusCode).to.be.eql(404);

					expect(deployment_frequency_stub.called).to.be.false;
					expect(lead_time_for_changes_stub.called).to.be.false;
					expect(deployment_started_stub.called).to.be.false;
					expect(deployment_duration_stub.called).to.be.false;
				});
			});

			it('should reject a create_if_not_exists if no project id', () => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/deployments/deployment_1/deployed',
					payload: {
						create_if_not_exists: true,
						first_commit_at: '2020-04-04T00:00:00.000Z'
					}
				}).then(response => {
					expect(response.statusCode).to.be.eql(400);
				});
			});

			it('should reject a create_if_not_exists if no first_commit_at', () => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/deployments/deployment_1/deployed',
					payload: {
						create_if_not_exists: true,
						project_id: 'project-1'
					}
				}).then(response => {
					expect(response.statusCode).to.be.eql(400);
				});
			});

			it('should create the deployment & "deploy" it', () => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/deployments/deployment_1/deployed',
					payload: {
						create_if_not_exists: true,
						project_id: PROJECT_ID,
						first_commit_at: '2024-01-01T00:00:00.000Z',
						deploy_start_at: '2024-01-01T00:00:01.000Z',
						deployed_at: '2024-01-01T00:00:02.000Z'
					}
				}).then(response => {
					expect(response.statusCode).to.be.eql(201);

					expect(deployment_frequency_stub.calledOnce).to.be.true;

					expect(lead_time_for_changes_stub.calledOnce).to.be.true;
					expect(lead_time_for_changes_stub.calledWith(2000, {
						project_id: PROJECT_ID
					})).to.be.true;

					expect(deployment_started_stub.calledOnce).to.be.true;
					expect(deployment_started_stub.calledWith({
						project_id: PROJECT_ID
					})).to.be.true;

					expect(deployment_duration_stub.calledOnce).to.be.true;
					expect(deployment_duration_stub.calledWith(1000, {
						project_id: PROJECT_ID
					})).to.be.true;
				});
			});
		});

		describe('When a deployment was created beforehand', () => {
			beforeEach(() => {
				const deployment = new Deployment({
					id: 'deployment_test_1',
					first_commit_at: '2020-01-01T00:00:00.000Z',
					deploy_start_at: '2020-01-01T00:00:01.000Z',
					project_id: 'project-2'
				});

				return Deployment.objects.insert(deployment);
			});

			it('should call only necessary metrics', () => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/deployments/deployment_test_1/deployed',
					payload: {
						create_if_not_exists: false,
					}
				}).then(response => {
					console.log(response.body)
					expect(response.statusCode).to.be.eql(200);

					expect(deployment_frequency_stub.calledOnce).to.be.true;

					expect(lead_time_for_changes_stub.calledOnce).to.be.true;
					expect(deployment_duration_stub.calledOnce).to.be.true;

					expect(deployment_started_stub.called).to.be.false;
				});
			});

			it('should call only necessary metrics with custom date', () => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/deployments/deployment_test_1/deployed',
					payload: {
						create_if_not_exists: false,
						deployed_at: '2020-01-01T00:00:01.500Z'
					}
				}).then(response => {
					expect(response.statusCode).to.be.eql(200);

					expect(deployment_frequency_stub.calledOnce).to.be.true;

					expect(lead_time_for_changes_stub.calledOnce).to.be.true;
					expect(lead_time_for_changes_stub.calledWith(1500, {
						project_id: 'project-2'
					})).to.be.true;

					expect(deployment_duration_stub.calledOnce).to.be.true;
					expect(deployment_duration_stub.calledWith(500, {
						project_id: 'project-2'
					})).to.be.true;

					expect(deployment_started_stub.called).to.be.false;
				});
			});

			it('should not create a new deployment if requested', () => {
				const create_stub = sinon.stub(Deployment.objects, 'insert');
				return server.inject({
					method: 'POST',
					path: '/api/v1/deployments/deployment_test_1/deployed',
					payload: {
						create_if_not_exists: true,
						project_id: 'project-45',
						first_commit_at: '2024-01-01T00:00:00.000Z',
						deploy_start_at: '2024-01-01T00:00:00.000Z'
					}
				}).then(response => {
					expect(create_stub.called).to.be.false;
					expect(response.statusCode).to.be.eql(200);
					create_stub.restore();
				});
			});
		});
	});
});
