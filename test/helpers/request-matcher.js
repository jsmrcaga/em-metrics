const { expect } = require('chai');
const { RequestMatcher, RequestMatcherSet } = require('../../src/helpers/request-matcher');

describe.skip('Request Matcher', () => {
	describe('Headers', () => {
		it('should match a simple header without regex', () => {
			const matcher = new RequestMatcher({
				headers: {
					'x-test-header': {
						value: 'test_value',
						regex: false
					}
				}
			});

			expect(matcher.match_headers(new Headers({ 'X-Test-Header': 'test_value' }))).to.be.true;
			expect(matcher.match_headers(new Headers({ 'X-Test-Header': 'test_value_2' }))).to.be.false;
		});

		it('should match a simple header with regex (no flags)', () => {
			const matcher = new RequestMatcher({
				headers: {
					'x-test-header': {
						value: 'test_value',
						regex: true
					}
				}
			});

			expect(matcher.match_headers(new Headers({ 'X-Test-Header': 'something test_value something else' }))).to.be.true;
			expect(matcher.match_headers(new Headers({ 'X-Test-Header': 'Test_value_2' }))).to.be.true;
			expect(matcher.match_headers(new Headers({ 'X-Test-Header': 'test_val' }))).to.be.false;
		});

		it('should match a simple header with regex (w/flags)', () => {
			const matcher = new RequestMatcher({
				headers: {
					'x-test-header': {
						value: '^test_value$',
						regex: true,
						flags: 'i'
					}
				}
			});

			expect(matcher.match_headers(new Headers({ 'X-Test-Header': 'test_value' }))).to.be.true;
			expect(matcher.match_headers(new Headers({ 'X-Test-Header': 'Test_value' }))).to.be.true;
			expect(matcher.match_headers(new Headers({ 'X-Test-Header': 'something test_value Test_value something else' }))).to.be.false;
		});

		it('should match multiple headers', () => {
			const matcher = new RequestMatcher({
				headers: {
					'x-test-header': {
						value: '^test_value$',
						regex: true,
						flags: 'i'
					},
					'x-another-header': {
						value: 'strict_value'
					}
				}
			});

			expect(matcher.match_headers(new Headers({ 'X-Test-Header': 'test_value', 'x-another-header': 'strict_value' }))).to.be.true;
			expect(matcher.match_headers(new Headers({ 'X-Test-Header': 'test_value2', 'x-another-header': 'strict_value' }))).to.be.false;
			expect(matcher.match_headers(new Headers({ 'X-Test-Header': 'test_value', 'x-another-header': 'else' }))).to.be.false;
			expect(matcher.match_headers(new Headers({ 'X-Test-Header': 'x', 'x-another-header': 'y' }))).to.be.false;
		});
	});

	describe('Body', () => {
		it('should match a single json path', () => {
			const matcher = new RequestMatcher({
				body: {
					type: 'json',
					json: {
						'a.simple.path': {
							regex: false,
							value: 'test'
						}
					}
				}
			});

			const matches = matcher.match_body('', {
				a: {
					simple: {
						path: 'test',
						extra: 1
					},
					extra: 2
				},
				extra: 3
			});

			expect(matches).to.be.true;
		});

		it('should match multiple json paths w/ regex', () => {
			const matcher = new RequestMatcher({
				body: {
					type: 'json',
					json: {
						'a.simple.path': {
							regex: false,
							value: 'test'
						},
						'a.regex.path': {
							regex: true,
							flags: 'i',
							value: '^plep'
						}
					}
				}
			});

			const matches = matcher.match_body('', {
				a: {
					simple: {
						path: 'test',
						extra: 1
					},
					regex: {
						path: 'plep and something extra'
					},
					extra: 2
				},
				extra: 3
			});

			expect(matches).to.be.true;
		});

		it('should not match multiple json paths if 1 is false', () => {
			const matcher = new RequestMatcher({
				body: {
					type: 'json',
					json: {
						'a.simple.path': {
							regex: false,
							value: 'test'
						},
						'a.regex.path': {
							regex: true,
							flags: 'i',
							value: '^plep'
						}
					}
				}
			});

			const matches = matcher.match_body('', {
				a: {
					simple: {
						path: 'test',
						extra: 1
					},
					regex: {
						path: 'plip plep and something extra'
					},
					extra: 2
				},
				extra: 3
			});

			expect(matches).to.be.false;
		});

		it('should match a general regex', () => {
			const matcher = new RequestMatcher({
				body: {
					type: 'regex',
					regex: 'plep-plip-plup',
					flags: 'gi'
				}
			});

			const matches = matcher.match_body('some random string plep-plip-plup some extra random strings', {});
			expect(matches).to.be.true;
		});

		it('does not match a general regex', () => {
			const matcher = new RequestMatcher({
				body: {
					type: 'regex',
					regex: 'plep-plip-plup',
					flags: 'gi'
				}
			});

			const matches = matcher.match_body('some random string some extra random strings', {});
			expect(matches).to.be.false;
		});
	});

	describe('Request Matcher set', () => {
		it('should match a request for multiple matchers', () => {
			const matcher_set = new RequestMatcherSet([{

			}]);

			const matches = matcher_set.test();

			expect(matches).to.be.true;
		});

		it('should match a request for a single matcher (multiple in config)', () => {

		});

		it('Should run & match for multiple matchers', () => {

		})
	});
});
