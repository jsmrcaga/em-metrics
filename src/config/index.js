const Ajv = require('ajv');

const AjvFormats = require('../helpers/ajv/formats');
const { Teams } = require('../teams/teams');

const LINEAR_SCHEMAS = {
	$id: 'http://schema.jocolina.com/schemas/linear.json',
	definitions: {
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
		}
	},
};

const SCHEMA = {
	// Nice catch: if no ID here, $ref reference is broken
	$id:'http://schema.jocolina.com/schemas/config.json',
	type: 'object',
	additionalProperties: false,
	properties: {
		teams: {
			type: 'object',
			// required: ['id'],
			minProperties: 0,
			additionalProperties: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					github_team_name: { type: 'string' },
					linear_team_id: { type: 'string' },
					users: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								email: { type: 'string' },
								github_username: { type: 'string' },
								slack_member_id: { type: 'string' }
							}
						}
					},
					projects: {
						type: 'array',
						items: { type: 'string' }
					},
				},
			},
		},
		ticketing: {
			type: 'object',
			properties: {
				linear: {
					type: 'object',
					properties: {
						ignore_parent_issues: { type: 'boolean' },
						ticket_type_selector: {
							$ref: 'linear.json#/definitions/ticket_type_selector'
						},
						customer_support_ticket_selectors: {
							type: 'array',
							items: {
								type: 'object',
								required: ['ticket_type_selector'],
								properties: {
									team_key: { type: 'string' },
									label_ids_allow_list: {
										type: 'array',
										items: { type: 'string' }
									},
									ticket_type_selector: {
										$ref: 'linear.json#/definitions/ticket_type_selector'
									},
								}
							}
						}
					}
				}
			}
		},
		version_control: {
			type: 'object',
			properties: {
				commits: {
					type: 'object',
					properties: {
						ai_author_emails: {
							type: 'array',
							items: {
								type: 'string',
								format: 'email'
							}
						}
					}
				}
			}
		}
	}
};

const ajv = new Ajv();
AjvFormats(ajv);

const validate = ajv.addSchema(LINEAR_SCHEMAS).compile(SCHEMA);

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

	reset() {
		this.init({});
	}

	toJSON() {
		return this.config;
	}

	get(path='') {
		return path.split('.').reduce((current_obj, key) => {
			if(!current_obj) {
				return null;
			}

			return current_obj[key] || null;
		}, this.config);
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
