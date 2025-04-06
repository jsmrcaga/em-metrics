const { Model } = require('@jsmrcaga/sqlite3-orm');

const {
	pull_request_opened_count,
	pull_request_closed_count,
	pull_request_merged_count,
	pull_request_loc_added,
	pull_request_loc_removed,
	pull_request_nb_comments_per_review,
	pull_request_time_to_first_review_minutes,
	pull_request_time_to_merge_minutes,
} = require('../metrics/core4/pull-requests');

class PullRequest extends Model {
	static TABLE_NAME = 'deployments';

	// Deliberately chose not to include project_id
	// because of the way projects live for teams.
	// They work on a project and then move to another,
	// meaning that getting stats per project would
	// just create the same counter but cut-off in between projects
	static SCHEMA = {
		id: { type: 'string', primary_key: true, required: true },
		team_id: { type: 'string', required: true },

		opened_at: { type: 'string', default: () => new Date().toISOString() },
		closed_at: { type: 'string', default: () => null },
		merged_at: { type: 'string', default: () => null },
		first_review_at: { type: 'string', default: () => null },
		nb_comments: { type: 'number', default: () => 0 },
		nb_reviews: { type: 'number', default: () => 0 },
	};

	static created(pr, { additions=null, deletions=null, team_id='unknown' }) {
		if(!(pr instanceof PullRequest)) {
			throw new Error(`pr must be instance of PullRequest, got ${pr.toString()}`);
		}

		return PullRequest.objects.insert(pr).then(() => {
			pull_request_opened_count.increment({
				team_id
			});

			if(additions) {
				pull_request_loc_added.record(additions, {
					team_id
				});
			}

			if(deletions) {
				pull_request_loc_removed.record(deletions, {
					team_id
				});
			}
		});
	}

	static reviewed(pr_id, { reviewed_at=new Date().toISOString(), nb_comments=0, team_id='unknown' }) {
		return PullRequest.objects.get(pr_id).then(pr => {
			pull_request_nb_comments_per_review.record(nb_comments, {
				team_id
			});

			if(!pr.first_review_at) {
				pull_request_time_to_first_review_minutes.record(pr.);

				return PullRequest.objects.update(pr_id, {
					first_review_at: reviewed_at
				});
			}
		});
	}

	static closed(pr_id, { closed_at=new Date().toISOString(), team_id='unknown' }) {
		return PullRequest.objects.update(pr_id, {
			closed_at
		}).then(() => {
			pull_request_closed_count.increment({
				team_id
			});
		});
	}

	static merged(pr_id, { merged_at=new Date().toISOString(), team_id='unknown', nb_reviews=0 } = {}){
		let time_to_merge_minutes;
		return PullRequest.objects.get(pr_id).then(pr => {
			const time_to_merge_ms = new Date(merged_at).getTime() - new Date(pr.opened_at).getTime();
			time_to_merge_minutes = time_to_merge_ms / 1000 / 60;
			
			return PullRequest.objects.update(pr_id, {
				merged_at
			});
		}).then(() => {
			pull_request_merged_count.increment({
				team_id
			});

			pull_request_time_to_merge_minutes.record(time_to_merge_minutes, {
				team_id
			});
		});
	}
}

module.exports = {
	PullRequest
};
