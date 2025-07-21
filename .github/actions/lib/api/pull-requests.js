class PullRequestsClient {
	constructor(api_client) {
		this.api_client = api_client;
	}

	opened({ id, opened_at, team_id, additions, deletions } = {}) {
		return this.api_client.request('/api/v1/pull-requests', {
			method: 'POST',
			body: {
				id,
				opened_at,
				team_id,
				additions,
				deletions
			}
		});
	}

	merged({ id, merged_at } = {}) {
		return this.api_client.request(`/api/v1/pull-requests/${id}/merged`, {
			method: 'POST',
			body: { merged_at }
		});
	}

	reviewed({ id, reviewed_at, nb_comments } = {}) {
		return this.api_client.request(`/api/v1/pull-requests/${id}/reviewed`, {
			method: 'POST',
			body: { reviewed_at, nb_comments }
		});
	}

	closed({ id, closed_at } = {}) {
		return this.api_client.request(`/api/v1/pull-requests/${id}/closed`, {
			method: 'POST',
			body: { closed_at }
		});
	}
}

module.exports = {
	PullRequestsClient
};
