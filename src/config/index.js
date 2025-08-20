const Ajv = require('ajv');
const { Teams } = require('../teams/teams');

const SCHEMA = {
	type: 'object',
	properties: {
		teams: {
			type: 'object',
			additionalProperties: {
				type: 'object',
				properties: {
					projects: {
						type: 'array',
						items: { type: 'string' }
					},
					users: {
						type: 'array',
						items: { type: 'string' }
					}
				}
			}
		},
		ticketing: {
			type: 'object',
			properties: {
				linear: {
					type: 'object',
					properties: {
						ignore_parent_issues: { type: 'boolean' },
						incident_label_id: { type: 'string' },
						ticket_type_selector: {
							type: 'object',
							properties: {
								parent_label_id: { type: ['string', 'null'] },
								allow_list: {
									type: 'array',
									items: { type: 'string' }
								}
							},
							anyOf: [
								{ required: ["parent_label_id"] },
								{ required: ["allow_list"] }
							]
						},
					}
				}
			}
		}
	}
};

const validate = new Ajv().compile(SCHEMA);

class Config {
	static validate(data={}) {
		const valid = validate(data);
		if(!valid) {
			const error = new Error('Bad config');
			error.errors = validate.errors;
			throw error;
		}
	}

	constructor(config={}) {
		this.init(config);
	}

	// Not private for testing purposes
	init(config = {}) {
		this.config = config;
		this.teams = new Teams(this.config.teams || {});
	}

	toJSON() {
		return this.config;
	}

	load(filename) {
		if(!filename) {
			// no config file, continue
			return;
		}

		const json = require(filename);
		this.constructor.validate(json);

		return this.init(json);
	}
}

const config = new Config();

module.exports = { config, Config };
