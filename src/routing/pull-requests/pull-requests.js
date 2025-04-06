const { PullRequest } = require('../../models/pull-request');

module.exports = (server, options, done) => {
	server.post('/', {
		schema: {
			body: {
				properties: {
					id: { type: 'string' },
					opened_at: { type: 'string', format: 'isodate' },
					team_id: { type: 'string' },
					additions: { type: 'number' },
					deletions: { type: 'number' },
				},
				required: ['id', 'team_id']
			}
		}
	}, (req, reply) => {
		const { id, team_id, opened_at, additions, deletions } = req.body;
		return PullRequest.created({
			id,
			team_id,
			opened_at,
			additions,
			deletions
		});
	});

	server.post('/:id/reviewed', {
		schema: {
			body: {
				properties: {
					nb_comments: { type: 'number' },
					reviewed_at: { type: 'string', format: 'isostring' },
					team_id: { type: 'string' }
				},
				required: ['team_id']
			}
		}
	}, (req, reply) => {
		const { reviewed_at, nb_comments, team_id } = req.body;
		return PullRequest.reviewed(req.params.id, {
			reviewed_at,
			nb_comments,
			team_id
		});
	});

	server.post('/:id/closed', {
		schema: {
			body: {
				properties: {
					closed_at: { type: 'string', format: 'isostring' },
					team_id: { type: 'string' }
				},
				required: ['team_id']
			}
		}
	}, (req, reply) => {
		const { closed_at, team_id } = req.body;
		return PullRequest.closed(req.params.id, {
			closed_at,
			team_id
		});
	});

	server.post('/:id/merged', {
		schema: {
			body: {
				properties: {
					merged_at: { type: 'string', format: 'isostring' },
					team_id: { type: 'string' }
				},
				required: ['team_id']
			}
		}
	}, (req, reply) => {
		const { merged_at, team_id } = req.body;
		return PullRequest.merged(req.params.id, {
			merged_at,
			team_id
		});
	});

	done();
};
