const { expect } = require('chai');
const { create_server } = require('../../src/server');

const server = create_server();

const apply_env = (env) => {
	for(const [k, v] of Object.entries(env)) {
		process.env[k] = v;
	}
}

const AUTH_KEYS = [
	'EM_METRICS_NO_AUTH',
	'EM_METRICS_BASIC_AUTH_USERNAME',
	'EM_METRICS_BASIC_AUTH_PASSWORD',
	'EM_METRICS_TOKEN_AUTH',
];

const clear_env_auth = () => {
	for(const k of AUTH_KEYS) {
		delete process.env[k];
	}
};

const clear_env = (env={}) => {
	beforeEach(() => {
		// clear env before to start with a clean slate
		// will override the beforeEach from the setup
		clear_env_auth();
	});

	afterEach(() => {
		// clear env after to ensure this suite does not break the others
		clear_env_auth();
	});
}

describe('Auth', () => {
	clear_env();

	describe('No auth', () => {
		const matrix = [{
			EM_METRICS_NO_AUTH: true
		}, {
			EM_METRICS_NO_AUTH: true,
			EM_METRICS_TOKEN_AUTH: 'token'
		}, {
			EM_METRICS_NO_AUTH: true,
			EM_METRICS_BASIC_AUTH_USERNAME: 'username',
			EM_METRICS_BASIC_AUTH_PASSWORD: 'password'
		}, {
			EM_METRICS_NO_AUTH: true,
			EM_METRICS_TOKEN_AUTH: 'token',
			EM_METRICS_BASIC_AUTH_USERNAME: 'username',
			EM_METRICS_BASIC_AUTH_PASSWORD: 'password'
		}, ];

		for(let i = 0; i < matrix.length; i++) {
			const env = matrix[i];

			it(`should allow a request without auth (${i+1}/${matrix.length})`, () => {
				apply_env(env);

				return server.inject({
					method: 'GET',
					path: '/api/v1/health'
				}).then(response => {
					expect(response.statusCode).to.be.eql(200);
					expect(JSON.parse(response.body)?.ok).to.be.true;
				});
			});
		}
	});

	describe('Basic auth', () => {
		const matrix = [{
			EM_METRICS_BASIC_AUTH_USERNAME: 'username',
		}, {
			EM_METRICS_BASIC_AUTH_PASSWORD: 'password',
		}, {
			EM_METRICS_BASIC_AUTH_USERNAME: 'username',
			EM_METRICS_BASIC_AUTH_PASSWORD: 'password',
		}];

		for(let i = 0; i < matrix.length; i++) {
			const env = matrix[i];

			// This will ensure our automatic tests match the token
			const {
				EM_METRICS_BASIC_AUTH_USERNAME: username = '',
				EM_METRICS_BASIC_AUTH_PASSWORD: password = ''
			} = env;

			it(`should fail basic auth (no header) (${i + 1}/${matrix.length})`, () => {
				apply_env(env);
				return server.inject({
					method: 'GET',
					path: '/api/v1/health',
				}).then(response => {
					expect(response.statusCode).to.be.eql(401);
					const headers = new Headers(response.headers);
					expect(headers.get('WWW-Authenticate')).to.be.eql('Basic realm=web-http');
					expect(response.body).to.be.eql('Authorization Required');
				});
			});

			it(`should fail basic auth (${i + 1}/${matrix.length})`, () => {
				apply_env(env);
				const fake_auth = 'chicken';
				return server.inject({
					method: 'GET',
					path: '/api/v1/health',
					headers: {
						'Authorization': `Basic fake_auth`
					}
				}).then(response => {
					expect(response.statusCode).to.be.eql(403);
					expect(response.body).to.be.eql('Wrong authentication for type "basic"');
				});
			});

			it(`should accept basic auth (${i + 1}/${matrix.length})`, () => {
				apply_env(env);
				const correct_auth = Buffer.from(`${username}:${password}`).toString('base64');
				return server.inject({
					method: 'GET',
					path: '/api/v1/health',
					headers: {
						'Authorization': `Basic ${correct_auth}`
					}
				}).then(response => {
					expect(response.statusCode).to.be.eql(200);
					expect(JSON.parse(response.body)?.ok).to.be.true;
				});
			});

			it(`should fail basic auth if header is not marked as Basic (${i + 1}/${matrix.length})`, () => {
				apply_env(env);

				const correct_auth = Buffer.from(`${username}:${password}`).toString('base64');

				return server.inject({
					method: 'GET',
					path: '/api/v1/health',
					headers: {
						'Authorization': `Plep ${correct_auth}`
					}
				}).then(response => {
					expect(response.statusCode).to.be.eql(401);
					expect(response.body).to.be.eql('');
				});
			});
		}
	});

	describe('Token auth', () => {
		const token = 'super-secret-token';

		const env = {
			EM_METRICS_TOKEN_AUTH: token
		};

		it('should fail token auth (no header)', () => {
			apply_env(env);
			return server.inject({
				method: 'GET',
				path: '/api/v1/health',
			}).then(response => {
				expect(response.statusCode).to.be.eql(401);
				expect(response.body).to.be.eql('Authorization Required');
			});
		});

		it('should fail token auth', () => {
			apply_env(env);
			const fake_auth = 'chicken';
			return server.inject({
				method: 'GET',
				path: '/api/v1/health',
				headers: {
					'Authorization': fake_auth
				}
			}).then(response => {
				expect(response.statusCode).to.be.eql(401);
				expect(response.body).to.be.eql('');
			});
		});

		it('should accept token auth', () => {
			apply_env(env);
			return server.inject({
				method: 'GET',
				path: '/api/v1/health',
				headers: {
					'Authorization': `Token ${token}`
				}
			}).then(response => {
				expect(response.statusCode).to.be.eql(200);
				expect(JSON.parse(response.body)?.ok).to.be.true;
			});
		});

		it('should fail token auth', () => {
			apply_env(env);
			return server.inject({
				method: 'GET',
				path: '/api/v1/health',
				headers: {
					'Authorization': `Token plep`
				}
			}).then(response => {
				expect(response.statusCode).to.be.eql(403);
				expect(response.body).to.be.eql('Wrong authentication for type "token"');
			});
		});

		it('should fail token auth if header is not marked as Token', () => {
			apply_env(env);

			return server.inject({
				method: 'GET',
				path: '/api/v1/health',
				headers: {
					'Authorization': `Plep ${token}`
				}
			}).then(response => {
				expect(response.statusCode).to.be.eql(401);
				expect(response.body).to.be.eql('');
			});
		});
	});

	describe('Any auth', () => {
		const env = {
			EM_METRICS_TOKEN_AUTH: 'token',
			EM_METRICS_BASIC_AUTH_USERNAME: 'username',
			EM_METRICS_BASIC_AUTH_PASSWORD: 'password'
		};

		const {
			EM_METRICS_TOKEN_AUTH: token,
			EM_METRICS_BASIC_AUTH_USERNAME: username,
			EM_METRICS_BASIC_AUTH_PASSWORD: password
		} = env;

		it('should 401 if no auth header', () => {
			apply_env(env);
			return server.inject({
				method: 'GET',
				path: '/api/v1/health',
			}).then(response => {
				expect(response.statusCode).to.be.eql(401);
				expect(response.body).to.be.eql('Authorization Required');
			});
		});

		it('should accept token header', () => {
			apply_env(env);
			return server.inject({
				method: 'GET',
				path: '/api/v1/health',
				headers: {
					'Authorization': `Token ${token}`
				}
			}).then(response => {
				expect(response.statusCode).to.be.eql(200);
				expect(JSON.parse(response.body)?.ok).to.be.true;
			});
		});

		it('should fail token header', () => {
			apply_env(env);
			return server.inject({
				method: 'GET',
				path: '/api/v1/health',
				headers: {
					'Authorization': `Token test`
				}
			}).then(response => {
				expect(response.statusCode).to.be.eql(403);
				expect(response.body).to.be.eql('Wrong authentication for type "token"');
			});
		});

		it('should accept basic header', () => {
			apply_env(env);
			const correct_auth = Buffer.from(`${username}:${password}`).toString('base64');
			return server.inject({
				method: 'GET',
				path: '/api/v1/health',
				headers: {
					'Authorization': `Basic ${correct_auth}`
				}
			}).then(response => {
				expect(response.statusCode).to.be.eql(200);
				expect(JSON.parse(response.body)?.ok).to.be.true;
			});
		});

		it('should fail basic header', () => {
			apply_env(env);
			return server.inject({
				method: 'GET',
				path: '/api/v1/health',
				headers: {
					'Authorization': `Basic test`
				}
			}).then(response => {
				expect(response.statusCode).to.be.eql(403);
				expect(response.body).to.be.eql('Wrong authentication for type "basic"');
			});
		});


	});
});
