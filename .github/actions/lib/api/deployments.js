class DeploymentsClient {
	constructor(api_client) {
		this.api_client = api_client;
	}

	created({ id, project_id, first_commit_at } = {}) {
		return this.api_client.request('/api/v1/deployments', {
			method: 'POST',
			body: {
				id,
				project_id,
				first_commit_at
			}
		});
	}

	deployed({
		create_if_not_exists,
		id,
		project_id,
		first_commit_at,
		deploy_start_at,
		deployed_at
	} = {}) {
		return this.api_client.request(`/api/v1/deployments/${id}/deployed`, {
			method: 'POST',
			body: {
				create_if_not_exists,
				id,
				project_id,
				first_commit_at,
				deploy_start_at,
				deployed_at,
			}
		});
	}
}

module.exports = {
	DeploymentsClient
};
