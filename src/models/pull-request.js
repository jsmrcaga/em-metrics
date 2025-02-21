const { Model } = require('@jsmrcaga/sqlite3-orm');

const {} = require('../metrics/core4/pull-requests');

class PullRequest extends Model {
	static TABLE_NAME = 'deployments';

	static SCHEMA = {
		// id is required because it's computed beforehand
		id: { type: 'string', primary_key: true, required: true },
		project_id: { type: 'string', required: true },

		opened_at: { type: 'string', default: () => new Date().toISOString() },
		first_review_at: { type: 'string',  },
		nb_comments: { type: 'number', default: () => 0 },
		nb_reviews: { type: 'number', default: () => 0 },
	};

	static created(pr, { team_id=undefined }={}) {
		return PullRequest.objects.insert(pr).then(() => {
			// send metric
		});
	}

	static reviewed(pr_id, { nb_comments=0 }) {
		// get PR
		// if 1st review, mark 1st_review_time
		// add nb_comments and nb_reviews to PR
		// mark nb_comments_per_review
	}

	static merged(deployment, { date=new Date().toISOString(), team_id=undefined } = {}){
		// get PR
		// mark as merged
		// send merged - created to time_to_merge
	}
}

module.exports = {
	PullRequest
};
