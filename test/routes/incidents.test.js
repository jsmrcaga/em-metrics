const sinon = require('sinon');
const { expect } = require('chai');

const { server } = require('../../src/server');
const {
	Incident,
	incident_count,
	incident_restored,
	incident_finished,
	time_to_detect
} = require('../../src/models/incident');
const { Deployment } = require('../../src/models/deployment');

const { DORA: { time_to_restore, change_failure_rate }} = require('../../src/metrics');

describe('Incidents', () => {
	let time_to_restore_stub;
	let change_failure_rate_stub;
	let incident_count_stub;
	let incident_restored_stub;
	let incident_finished_stub;

	const now = new Date('2024-10-05T10:00:00.000Z');

	beforeEach(() => {
		time_to_restore_stub = sinon.stub(time_to_restore, 'record');
		change_failure_rate_stub = sinon.stub(change_failure_rate, 'increment');
		incident_count_stub = sinon.stub(incident_count, 'increment');
		incident_restored_stub = sinon.stub(incident_restored, 'increment');
		incident_finished_stub = sinon.stub(incident_finished, 'increment');
		time_to_detect_stub = sinon.stub(time_to_detect, 'record');
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('Create', () => {
		it('should not allow incidents without project_id', () => {
			return server.inject({
				method: 'POST',
				path: '/api/v1/incidents',
				payload: {
					id: 'incident-1',
					deployment_id: 'deployment-1',
					started_at: '2022-01-01T00:00:00.000Z',
					restored_at: '2022-01-01T00:00:00.000Z',
					finished_at: '2022-01-01T00:00:00.000Z'
				}
			}).then(response => {
				expect(response.statusCode).to.eql(400);
				const json = JSON.parse(response.body);

				expect(json.errors[0].message).to.match(/project_id/);
				return Incident.objects.all();
			}).then(incidents => {
				expect(incidents).to.have.length(0);
			});
		});

		it('should fail to create an incident for FK deployment', () => {
			return server.inject({
				method: 'POST',
				path: '/api/v1/incidents',
				payload: {
					project_id: 'project-1',
					deployment_id: 'deployment-123'
				}
			}).then(response => {
				expect(response.statusCode).to.eql(400);
				expect(response.body).to.match(/Database constraint violated/);
				return Incident.objects.all();
			}).then(incidents => {
				expect(incidents).to.have.length(0);
			});
		});

		it('should create an incident and increment incident_count (no deployment)', () => {
			return server.inject({
				method: 'POST',
				path: '/api/v1/incidents',
				payload: {
					project_id: 'project-1'
				}
			}).then(response => {
				expect(response.statusCode).to.eql(201);
				return Incident.objects.all();
			}).then(incidents => {
				expect(incidents).to.have.length(1);

				expect(incident_count_stub.calledOnce).to.be.true;
				expect(incident_count_stub.calledWith({
					project_id: 'project-1',
				})).to.be.true;
				expect(time_to_detect_stub.called).to.be.false;
				expect(change_failure_rate_stub.called).to.be.false;
			});
		});

		it('should create an incident and increment incident_count and change failure rate, and time_to_detect', () => {
			const deployment_id = 'depl-123';

			const deployment = new Deployment({
				id: deployment_id,
				project_id: 'project-1',
				first_commit_at: '2020-1-01T00:00:00.000Z',
				deployed_at: '2024-10-05T10:01:00.000Z',
			});

			return Deployment.objects.insert(deployment).then(() => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/incidents',
					payload: {
						deployment_id,
						project_id: 'project-1',
					}
				});
			}).then(response => {
				expect(response.statusCode).to.eql(201);
				expect(incident_count_stub.calledOnce).to.be.true;
				expect(time_to_detect_stub.calledOnce).to.be.true;
				expect(change_failure_rate_stub.calledOnce).to.be.true;
				expect(change_failure_rate_stub.calledWith({
					project_id: 'project-1'
				})).to.be.true;
				expect(time_to_restore_stub.calledOnce).to.be.false;
				expect(incident_restored_stub.called).to.be.false;
				expect(incident_finished_stub.called).to.be.false;
			});
		});

		it('should create an incident and increment incident_count, change failure rate and time to restore', () => {
			const deployment_id = 'depl-123';

			const deployment = new Deployment({
				id: deployment_id,
				project_id: 'project-1',
				first_commit_at: '2020-01-01T00:00:00.000Z',
				deployed_at: '2024-10-05T10:01:00.000Z',
			});

			return Deployment.objects.insert(deployment).then(() => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/incidents',
					payload: {
						deployment_id,
						project_id: 'project-1',
						started_at: '2024-10-05T10:00:00.000Z',
						restored_at: '2024-10-05T10:00:01.000Z'
					}
				});
			}).then(response => {
				expect(response.statusCode).to.eql(201);

				expect(incident_count_stub.calledOnce).to.be.true;
				expect(change_failure_rate_stub.calledOnce).to.be.true;
				expect(change_failure_rate_stub.calledWith({
					project_id: 'project-1'
				})).to.be.true;
				expect(time_to_restore_stub.calledOnce).to.be.true;
				expect(time_to_detect_stub.calledOnce).to.be.true;
				expect(time_to_restore_stub.calledWith(1000, {
					project_id: 'project-1'
				})).to.be.true;
				expect(incident_restored_stub.called).to.be.true;
				expect(incident_finished_stub.called).to.be.false;
			});
		});


		describe('Incident id generation', () => {
			it('should create an incident with nothing else than project_id & generate a custom ID', () => {
				const i1 = new Incident({ project_id: 'project-1', id: 'i1' });

				return Incident.objects.insert(i1).then(() => {
					return server.inject({
						method: 'POST',
						path: '/api/v1/incidents',
						payload: {
							project_id: 'project-1'
						}
					});
				}).then(response => {
					expect(response.statusCode).to.eql(201);
					return Incident.objects.all();
				}).then(incidents => {
					expect(incidents).to.have.length(2);
					expect(incidents[1].id).to.be.eql('incident_project-1_2');
				});
			});

			it('Should break if id already exists', () => {
				const i1 = new Incident({ project_id: 'project-1', id: 'i1' });

				return Incident.objects.insert(i1).then(() => {
					return server.inject({
						method: 'POST',
						path: '/api/v1/incidents',
						payload: {
							id: 'i1',
							project_id: 'project-1'
						}
					});
				}).then(response => {
					expect(response.statusCode).to.eql(400);
					expect(response.body).to.match(/Database constraint violated/);
					return Incident.objects.all();
				}).then(incidents => {
					expect(incidents).to.have.length(1);
				});
			})
		});
	});

	describe('Resolve', () => {
		// TOOD: add time_to_restore called_with
		it('should resolve an incident without date and record time to restore', () => {
			const i1 = new Incident({ project_id: 'project-1', id: 'i1', started_at: '2020-01-01T00:00:00.000Z' });

			return Incident.objects.insert(i1).then(() => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/incidents/i1/restored',
					payload: {}
				});
			}).then(response => {
				expect(response.statusCode).to.eql(200);
				expect(time_to_restore_stub.calledOnce).to.be.true;
			});
		});

		it('should resolve an incident with date and record time to restore', () => {
			const i1 = new Incident({ project_id: 'project-1', id: 'i1', started_at: '2020-01-01T00:00:00.000Z' });

			return Incident.objects.insert(i1).then(() => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/incidents/i1/restored',
					payload: {
						date: '2020-01-01T00:00:01.000Z'
					}
				});
			}).then(response => {
				expect(response.statusCode).to.eql(200);
				expect(time_to_restore_stub.calledOnce).to.be.true;
				expect(time_to_restore_stub.calledWith(1000, {
					project_id: 'project-1'
				})).to.be.true;
			});
		});
	});

	describe('Finish', () => {
		it('should finish a recoverd incident', () => {
			const i1 = new Incident({ project_id: 'project-1', id: 'i1', restored_at: '2020-01-01T00:00:00.000Z' });

			return Incident.objects.insert(i1).then(() => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/incidents/i1/finished',
					payload: {
						date: '2024-10-05T10:00:01.000Z'
					}
				});
			}).then(response => {
				expect(response.statusCode).to.eql(200);
				expect(incident_finished_stub.calledOnce).to.be.true;
				expect(time_to_restore_stub.called).to.be.false;

				return Incident.objects.get(i1.id);
			}).then(incident => {
				expect(incident.finished_at).not.to.be.undefined;
				expect(incident.finished_at).not.to.be.null;
			});
		});

		it('should finish a non-recoverd incident and record TTR', () => {
			const i1 = new Incident({ started_at: '2024-10-05T10:00:00.000Z', project_id: 'project-1', id: 'i1' });

			return Incident.objects.insert(i1).then(() => {
				return server.inject({
					method: 'POST',
					path: '/api/v1/incidents/i1/finished',
					payload: {
						date: '2024-10-05T10:00:01.000Z'
					}
				});
			}).then(response => {
				expect(response.statusCode).to.eql(200);
				expect(incident_finished_stub.calledOnce).to.be.true;
				expect(time_to_restore_stub.calledOnce).to.be.true;
				expect(time_to_restore_stub.calledWith(1000, {
					project_id: 'project-1'
				})).to.be.true;

				return Incident.objects.get(i1.id);
			}).then(incident => {
				expect(incident.restored_at).to.eql('2024-10-05T10:00:01.000Z');
				expect(incident.finished_at).to.eql('2024-10-05T10:00:01.000Z');
			});
		});
	})
});
