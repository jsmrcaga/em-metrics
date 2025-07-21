const fs = require('node:fs');

const { log } = require('./logger');
const { Process } = require('./process');

const ENDPOINT = 'https://api.github.com';

class Github {
	constructor(token=process.env.GITHUB_TOKEN) {
		if(!token) {
			throw new Error('Token is mandatory');
		}

		this.token = token;
		this.event_cache = {};
	}

	request(path, options = {}) {
		const headers = options.headers || {};
		headers['Authorization'] = `Bearer ${this.token}`;

		const url = `${ENDPOINT}${path}`;
		return fetch(url, {
			headers,
			...options
		}).then(res => {
			if(!res.ok) {
				return res.text().then(text => {
					const error = new Error('Error requesting Github API');
					error.path = path;
					error.response = text;
					error.status = res.status;
					throw error;
				});
			}

			return res.json();
		});
	}

	get_event_or_exit(event_handlers={}) {
		const accepted_events = Object.entries(event_handlers).reduce((agg, [event, type_handlers]) => {
			agg[event] = new Set(Object.keys(type_handlers));
			return agg;
		}, {});


		const event_name = this.event_name();
		if(!(event_name in accepted_events)) {
			log.notice(`Event ${event_name} is not supported. Exiting.`);
			Process.exit(0);
			return { event: null, event_name: null };
		}


		// Check if event is acceptable
		const event = this.event();
		const { action: event_type } = event;
		if(!accepted_events[event_name].has(event_type)) {
			log.notice(`Event ${event_name} type ${event_type} is not supported. To avoid this message only call the workflow on supported events. Exiting now.`);
			Process.exit(0);
			return { event: null, event_name: null };
		}

		return { event, event_name };
	}

	get_nb_review_comments({ repo=process.env.GITHUB_REPOSITORY, review_id, pull_request_nb }) {
		return this.request(`/repos/${repo}/pulls/${pull_request_nb}/reviews/${review_id}/comments`).then(comments => {
			return comments.length;
		});
	}

	event() {
		const event_path = process.env.GITHUB_EVENT_PATH;
		if(this.event_cache[event_path]) {
			return this.event_cache;
		}

		const event = this.read_event_file(event_path);
		this.event_cache[event_path] = JSON.parse(event);
		return this.event_cache[event_path];
	}

	// Separate method for mocking
	read_event_file(path) {
		return fs.readFileSync(path, 'utf-8');
	}

	event_name() {
		return process.env.GITHUB_EVENT_NAME;
	}
}


module.exports = {
	Github
};
