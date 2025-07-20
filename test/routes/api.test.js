const { expect } = require('chai');
const { create_server } = require('../../src/server');
const { Config } = require('../../src/config');

const server = create_server();

describe('API', () => {
	describe('Version', () => {
		it('should return -1 if no version in environment', () => {
			return server.inject({
				method: 'GET',
				path: '/api/v1/version'
			}).then(response => {
				expect(response.statusCode).to.be.eql(200);
				expect(JSON.parse(response.body)?.version).to.be.eql('-');
			});
		});

		it('should send the current version in environment', () => {
			process.env.EM_METRICS_VERSION = 'v1.2.3'
			return server.inject({
				method: 'GET',
				path: '/api/v1/version'
			}).then(response => {
				expect(response.statusCode).to.be.eql(200);
				expect(JSON.parse(response.body)?.version).to.be.eql('v1.2.3');
			});

			delete process.env.EM_METRICS_VERSION;
		});
	});

	describe('Config', () => {
		it('should return the current config', () => {
			const config = new Config();
			const config_value = {
				random: 'stuff',
				not: 'validated',
				and: {
					stacked: 'data',
					number: 123
				},
				teams: []
			};

			config.init(config_value);
			const scoped_server = create_server(config);

			return scoped_server.inject({
				method: 'GET',
				path: '/api/v1/config'
			}).then(response => {
				expect(response.statusCode).to.be.eql(200);
				expect(JSON.parse(response.body)).to.be.eql(config_value);

				scoped_server.close()
			});
		});
	})
});
