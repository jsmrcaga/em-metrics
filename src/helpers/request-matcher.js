const BODY_TYPES = {
	REGEX: 'regex',
	JSON: 'json'
};

class RequestMatcher {
	constructor({ headers=null, body=null }={}) {
		this.matchers = {
			headers,
			body
		};
	}

	test({ headers, body, json_body }) {

	}

	match_headers(request_headers) {
		if(!this.matchers.headers) {
			return true;
		}

		return Object.entries(this.matchers.headers).every(([header, { value, regex = false, flags = null }]) => {
			const request_header_value = request_headers.get(header);

			if(!request_header_value) {
				return false;
			}

			if(regex) {
				const match_regex = new RegExp(value, flags ?? 'gi');
				if(match_regex.test(request_header_value)) {
					return true
				}
			}

			return request_header_value === value;
		});
	}

	// json_request_body is necessary to prevent re-parsing on every matcher
	match_body(raw_request_body, json_request_body) {
		if(this.matchers.body.type === BODY_TYPES.REGEX) {
			if(!this.matchers.body.regex) {
				throw new Error('`regex` is mandatory for Body with type "regex"');
			}

			const regex = new RegExp(this.matchers.body.regex, this.matchers.body.flags ?? 'gi');
			return regex.test(raw_request_body);
		}

		return Object.entries(this.matchers.body.json).every(([key, { regex=false, flags=null, value }]) => {
			// "simple" traverse the body
			const body_value = key.split('.').reduce((acc, current) => acc[current] || {}, json_request_body);

			if(regex) {
				const body_regexp = new RegExp(value, flags ?? 'gi');
				return body_regexp.test(body_value);
			}

			return body_value === value;
		});
	}
}

class RequestMatcherSet {
	constructor(matchers_config=[]) {
		this.matchers = matchers_config.map(matcher_conf => {
			return new RequestMatcher(matcher_conf);
		});
	}

	test(request) {
		const headers = new Headers(request.headers);
		const body = request.body;
	}
}

module.exports = {
	RequestMatcher,
	RequestMatcherSet
};

// {
// 	headers: {
// 		"X-My-Header": {
// 			value: "test",
// 			regex: false
// 		},
// 		"Content-Type": {
// 			value: "application/json",
// 			regex: false
// 		}
// 	},
// 	body: {
// 		type: 'json' | 'regex',
// 		json: {
// 			'data[0].key': 'value'
// 		},
// 		regex: 'test.[a-z]{4}',
// 		flags: 'gi'
// 	}
// }
