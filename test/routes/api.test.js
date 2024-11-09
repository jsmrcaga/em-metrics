const { expect } = require('chai');
const { server } = require('../../src/server');

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
});
