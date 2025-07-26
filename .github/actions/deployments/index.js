const { EMAPIClient } = require('../lib/em-api-client');
const { log } = require('../lib/logger');
const { Process } = require('../lib/process');
const { EnvParser } = require('../lib/env-parser');

function run() {
	const em_api_client = new EMAPIClient({
		token: process.env.INPUT_EM_API_TOKEN
	});

	/**
	* @type {'CREATED' | 'DEPLOYED'}
	*/
	const type = process.env.INPUT_DEPLOYMENT_TYPE;

	if(!['CREATED', 'DEPLOYED'].includes(type)) {
		log.error('deployment_type can only be CREATED or DEPLOYED');
		Process.exit(1);
		return Promise.resolve();
	}

	if(type === 'CREATED') {
		return em_api_client.deployments.created({
			id: process.env.INPUT_DEPLOYMENT_ID,
			project_id: process.env.INPUT_PROJECT_ID,
			first_commit_at: process.env.INPUT_FIRST_COMMIT_AT,
		});
	}

	const create_if_not_exists = EnvParser.parse_bool(process.env.INPUT_CREATE_IF_NOT_EXISTS ?? false);

	if(!process.env.INPUT_DEPLOYMENT_START_TIME) {
		log.error('deployment_start_time is mandatory when type is DEPLOYED');
		Process.exit(1);
		return Promise.resolve();
	}

	return em_api_client.deployments.deployed({
		create_if_not_exists,
		id: process.env.INPUT_DEPLOYMENT_ID,
		project_id: process.env.INPUT_PROJECT_ID,
		first_commit_at: process.env.INPUT_FIRST_COMMIT_AT,
		deploy_start_at: process.env.INPUT_DEPLOYMENT_START_TIME,
		deployed_at: new Date().toISOString()
	});
}

// for testing
module.exports = {
	run
};

// Run if necessary
if(require.main === module) {
	run();
}
