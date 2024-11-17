const { DoesNotExist } = require('@jsmrcaga/sqlite3-orm');
const { Deployment } = require('../../models/deployment');

const { config } = require('../../config');

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
					username: { type: 'string' }
				},
			}
		}
	}, (req, reply) => {
		const team_id = config.teams.get_team_from_context({ username: req.body.username, project_id: req.body.project_id });
		const deployment = new Deployment(req.body);
		return Deployment.start(deployment, { team_id }).then(result => {
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
					deployed_at: { type: 'string' },
					username: { type: 'string' }
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
		const team_id = config.teams.get_team_from_context({ username: req.body.username, project_id: req.body.project_id });
		return Deployment.objects.get(req.params.deployment_id).then(deployment => {
			return Deployment.deployed(deployment, { date: req.body.deployed_at, team_id }).then(result => {
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

			return Deployment.start(deployment, { team_id }).then(() => {
				// will be "now" by default
				return Deployment.deployed(deployment, { date: req.body.deployed_at, team_id });
			}).then(() => {
				return reply.status(201).send();
			});
		});
	});

	server.get('/', {
		schema: {
			query: {
				type: 'object',
				properties: {
					project_id: { type: 'string' },
					limit: { type: 'number' },
					offset: { type: 'number' }
				}
			}
		}
	}, (req, reply) => {
		let { project_id, limit='50', offset='0' } = req.query;
		limit = Number.parseInt(limit, 10);
		offset = Number.parseInt(offset, 10);

		if(project_id) {
			return Deployment.objects.filter('project_id = ? LIMIT ? OFFSET ?', project_id, limit, offset);
		}

		// Hack because WHERE is pre-included
		return Deployment.objects.filter('1 = 1 LIMIT ? OFFSET ?', limit, offset);
	});

	server.get('/:deployment_id', (req, reply) => {
		return Deployment.objects.get(req.params.deployment_id);
	});

	done();
};
