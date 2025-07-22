const { EMAPIClient } = require('../lib/em-api-client');
const { Github } = require('../lib/github');
const { log } = require('../lib/logger');
const { Process } = require('../lib/process');

function run() {
	// Use environment defaults
	const github = new Github(process.env.INPUT_GITHUB_TOKEN);
	const em_api_client = new EMAPIClient({
		token: process.env.INPUT_EM_API_TOKEN
	});

	const EVENT_HANDLERS = {
		pull_request: {
			opened: (event={}) => {
				return em_api_client.pull_request.opened({
					team_id: process.env.EM_METRICS_TEAM_ID,
					id: event.pull_request.id,
					opened_at: event.pull_request.created_at,
					additions: event.pull_request.additions,
					deletions: event.pull_request.deletions
				});
			},
			closed: (event) => {
				// Can be merged -> /merged or closed with no merge -> /closed
				if(event.pull_request?.merged) {
					return em_api_client.pull_request.merged({
						id: event.pull_request.id,
						merged_at: event.pull_request.merged_at
					});
				}

				return em_api_client.pull_request.closed({
					id: event.pull_request.id,
					closed_at: event.pull_request.closed_at
				});
			}
		},
		pull_request_review: {
			submitted: (event) => {
				if(!['APPROVED', 'CHANGES_REQUESTED'].includes(event.review?.state)) {
					log.log(`Ignoring review with state "${event.review?.state}"`);
					return;
				}

				return github.get_nb_review_comments({
					pull_request_nb: event.pull_request.number,
					review_id: event.review.id
				}).then(nb_comments => {
					return em_api_client.pull_request.reviewed({
						id: event.pull_request.id,
						nb_comments,
						reviewed_at: event.review.submitted_at
					});
				});
			}
		}
	};
	// Get event
	const { event, event_name } = github.get_event_or_exit(EVENT_HANDLERS);

	if(!event) {
		return;
	}

	const { action: event_type } = event;

	// Handle event
	const handler = EVENT_HANDLERS[event_name][event_type];
	if(!handler) {
		log.error(`Something went wrong, cannot find handler for ${event_type}::${event_type}`);
		Process.exit(1);
		return;
	}

	return handler(event);	
}

// for testing
module.exports = {
	run
};

// Run if necessary
if(require.main === module) {
	run();
}
