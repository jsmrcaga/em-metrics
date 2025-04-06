const { PullRequest } = require('../../models/pull-request');

module.exports = (server, options, done) => {
	server.post('/', {
		schema: {
			body: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					opened_at: { type: 'string' },
					team_id: { type: 'string' },
					additions: { type: 'number' },
					deletions: { type: 'number' },
				},
				required: ['id', 'team_id']
			}
		}
	}, (req, reply) => {
		const { id, team_id, opened_at=new Date().toISOString(), additions, deletions } = req.body;
		const pull_request = new PullRequest({
			id,
			team_id,
			opened_at,
		});

		return PullRequest.created(pull_request, {
			additions,
			deletions
		}).then(result => reply.status(201).send(result));
	});

	server.post('/:id/reviewed', {
		schema: {
			body: {
				type: 'object',
				properties: {
					nb_comments: { type: 'number' },
					reviewed_at: { type: 'string' },
				},
				required: []
			}
		}
	}, (req, reply) => {
		const { reviewed_at, nb_comments } = req.body;
		return PullRequest.reviewed(req.params.id, {
			reviewed_at,
			nb_comments,
		});
	});

	server.post('/:id/closed', {
		schema: {
			body: {
				type: 'object',
				properties: {
					closed_at: { type: 'string' },
				},
				required: []
			}
		}
	}, (req, reply) => {
		const { closed_at } = req.body;
		return PullRequest.closed(req.params.id, {
			closed_at,
		});
	});

	server.post('/:id/merged', {
		schema: {
			body: {
				type: 'object',
				properties: {
					merged_at: { type: 'string' },
				},
				required: []
			}
		}
	}, (req, reply) => {
		const { merged_at } = req.body;
		return PullRequest.merged(req.params.id, {
			merged_at,
		});
	});

	done();
};
