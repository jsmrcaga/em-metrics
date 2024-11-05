const { DoesNotExist } = require('@jsmrcaga/sqlite3-orm');
const { Deployment } = require('../../models/deployment');

module.exports = (server, options, done) => {
	server.post('/', {
		schema: {
			body: {
				type: 'object',
				required: [ 'id', 'project_id', 'first_commit_at' ],
				properties: {
					id: { type: 'string' },
					project_id: { type: 'string' },
					first_commit_at: { type: 'string' },
				},
			}
		}
	}, (req, reply) => {
		const deployment = new Deployment(req.body);
		return Deployment.start(deployment).then(result => {
			return reply.status(201).send();
		});
	});

	server.post('/:deployment_id/deployed', {
		schema: {
			body: {
				type: 'object',
				// if passes if value is not defined, so requiring it for now
				required: ['create_if_not_exists'],
				properties: {
					create_if_not_exists: { type: 'boolean' },

					project_id: { type: 'string' },
					deploy_start_at: { type: 'string' },
					first_commit_at: { type: 'string' },
					deployed_at: { type: 'string' }
				},
				if: {
					properties: {
						create_if_not_exists: { const: true }
					}
				},
				then: {
					required: ['project_id', 'first_commit_at', 'deploy_start_at']
				}
			}
		}
	}, (req, reply) => {
		return Deployment.objects.get(req.params.deployment_id).then(deployment => {
			return Deployment.deployed(deployment, req.body.deployed_at).then(result => {
				return reply.status(200).send();
			});

		}).catch(e => {
			if(!(e instanceof DoesNotExist)) {
				throw e;
			}

			const { create_if_not_exists, ...deployment_body } = req.body;
			if(!create_if_not_exists) {
				throw e;
			}

			const deployment = new Deployment({
				id: req.params.deployment_id,
				...deployment_body
			});

			return Deployment.start(deployment).then(() => {
				// will be "now" by default
				return Deployment.deployed(deployment, req.body.deployed_at);
			}).then(() => {
				return reply.status(201).send();
			});
		});
	});

	server.get('/:deployment_id', (req, reply) => {
		return Deployment.objects.get(req.params.deployment_id);
	});

	done();
};
