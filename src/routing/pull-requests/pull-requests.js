module.exports = (server, options, done) => {
	server.post('/', {
		schema: {
			body: {
				properties: {
					id: { type: 'string' },
					opened_at: { type: 'string', format: 'isodate' },
					project_id: { type: 'string' } 
				},
				required: ['id', 'project_id']
			}
		}
	}, (req, reply) => {
		// Create the PR in DB + pr_count metric
	});

	server.post('/:id/reviewed', {
		schema: {
			body: {
				properties: {
					nb_comments: { type: 'number' }
				}
			}
		}
	}, (req, reply) => {
		// Check if 1st review, if yes mark pr_first_review_time metric
		// Otherwise add to the nb of comments
	});

	server.post('/:id/merged', (req, reply) => {
		// Mark as merged in DB and send pr_lifecycle_time metric
		// Send the pr_number_of_comments metric
	});

	done();
};
