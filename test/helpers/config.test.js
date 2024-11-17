const path = require('node:path');
const { expect } = require('chai');
const { config } = require('../../src/config');

describe('Config', () => {
	describe('Validation', () => {
		it('should validate empty config', () => {
			expect(() => config.constructor.validate()).not.to.throw();
			expect(() => config.constructor.validate({})).not.to.throw();
		});

		it('should validate partial config', () => {
			expect(() => config.constructor.validate({
				teams: {}
			})).not.to.throw();

			expect(() => config.constructor.validate({
				teams: {
					team1: {
						projects: []
					}
				}
			})).not.to.throw();

			expect(() => config.constructor.validate({
				teams: {
					team1: {
						users: []
					}
				}
			})).not.to.throw();
			expect(() => config.constructor.validate({
				teams: {
					team1: {
						projects: [],
						users: []
					}
				}
			})).not.to.throw();
		});

		it('should fail because projects', () => {
			expect(() => config.constructor.validate({
				teams: {
					team1: {
						projects: { a: 5 }
					}
				}
			})).to.throw();

			expect(() => config.constructor.validate({
				teams: {
					team1: {
						projects: {}
					}
				}
			})).to.throw();
		});

		it('should fail because users', () => {
			expect(() => config.constructor.validate({
				teams: {
					team1: {
						users: { a: 5 }
					}
				}
			})).to.throw();

			expect(() => config.constructor.validate({
				teams: {
					team1: {
						users: {}
					}
				}
			})).to.throw();
		});
	});

	describe('Loading - singleton', () => {
		it('should load without a filename', () => {
			expect(() => config.load()).not.to.throw();
			expect(config.config).to.eql({});
		});

		it('should throw if unknown file', () => {
			expect(() => config.load(path.join(__dirname, './config/plep.json'))).to.throw();
		});

		it('should fail validation while loading', () => {
			expect(() => {
				config.load(path.join(__dirname, './config/bad-config.json'));
			}).to.throw();
		});

		it('should load successfully', () => {
			expect(() => {
				config.load(path.join(__dirname, './config/full-config.json'));
			}).not.to.throw();
			expect(config.config).to.eql({
				teams: {
					'team-1': {
						projects: ['p1', 'p2'],
						users: ['u1', 'u2']
					},
					'team-2': {
						projects: ['p2', 'p3'],
						users: ['u3']
					},
				}
			})
		})
	});
});
