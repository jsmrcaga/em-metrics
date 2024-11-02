const { DoesNotExist } = require('@jsmrcaga/sqlite3-orm');
const { Incident } = require('../../models/incident');

module.exports = (server, options, done) => {
	server.post('/', {
		schema: {
			body: {
				// re-typed instead of get-validation-schema because we have some interesting defaults to handle
				type: 'object',
				required: ['project_id'],
				properties: {
					id: { type: 'string' },
					project_id: { type: 'string' },
					deployment_id: { type: 'string' },
					started_at: { type: 'string' },
					restored_at: { type: 'string' },
					finished_at: { type: 'string' }
				}
			}
		}
	}, (req, reply) => {
		const create = (data) => {
			const incident = new Incident(data);
			return Incident.create(incident).then(result => {
				return reply.status(201).send(result);
			});
		};

		if(!req.body.id) {
			// generate id
			return Incident.objects.filter('project_id = ?', req.body.project_id).then(incidents => {
				const id = `incident_${req.body.project_id}_${incidents.length + 1}`;
				return create({
					...req.body,
					id
				});
			});
		}

		return create(req.body);
	});

	server.get('/', {
		schema: {
			query: {
				type: 'object',
				properties: {
					filter: {
						type: 'string',
						enum: ['in-progress']
					}
				}
			}
		}
	}, (req) => {
		if(req.query.filter === 'in-progress') {
			// Only send incidents not resolved
			return Incident.objects.filter('restored_at IS NULL');
		}
		
		return Incident.objects.filter('ended_at IS NULL OR restored_at IS NULL');
	});

	server.post('/:incident_id/restored', {
		schema: {
			body: {
				type: 'object',
				properties: {
					date: {
						type: 'string'
					}
				}
			}
		}
	}, (req, reply) => {
		const { incident_id } = req.params;
		let { date } = req.body;

		if(!date) {
			date = Date.now();
		} else {
			date = new Date(date).getTime();
		}

		// get to see if incident exists
		return Incident.objects.get(incident_id).then(incident => {
			return Incident.resolve(incident, date);
		}).catch(e => {
			if(e instanceof DoesNotExist) {
				return reply.status(404).send();
			}

			throw e;
		});
	});

	server.post('/:incident_id/finished', {
		schema: {
			body: {
				type: 'object',
				properties: {
					date: {
						type: 'string'
					}
				}
			}
		}
	}, (req, reply) => {
		const { incident_id } = req.params;
		let { date } = req.body;

		return Incident.objects.get(incident_id).then(incident => {
			return Incident.finish(incident, date);
		}).catch(e => {
			if(e instanceof DoesNotExist) {
				return reply.status(404).end();
			}

			throw e;
		});
	});

	done();
};
