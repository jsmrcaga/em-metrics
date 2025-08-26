const sinon = require('sinon');
const { expect } = require('chai');
const { Token } = require('@control/jwt');
const { GitHubAppClient } = require('../../../src/integrations/github/api/github-app-client');

describe('GitHub', () => {
	const INSTALLATION_ID = 'installation-id';

	let raw_request_stub;
	let client;

	describe('GitHub App client', () => {
		beforeEach(() => {
			GitHubAppClient.reset_cache();

			raw_request_stub = sinon.stub(GitHubAppClient.prototype, 'raw_request');

			client = new GitHubAppClient({
				endpoint: process.env.GITHUB_ENDPOINT,
				client_id: process.env.GITHUB_CLIENT_ID,
				installation_id: INSTALLATION_ID,
				rsa_pem_key: Buffer.from(process.env.GITHUB_RSA_PEM_KEY_B64, 'base64').toString('utf8')
			});
		});

		afterEach(() => {
			sinon.restore();
		});

		it('should request a new token when no cache', () => {
			// No cache token
			// Setup mocks
			raw_request_stub.onCall(0).callsFake(() => {
				return Promise.resolve({ data: { token: 'fake-access-token', expires_at: '2045-01-01T00:00:00.000Z' }});
			});

			raw_request_stub.onCall(1).callsFake(() => {
				return Promise.resolve({ data: [{ id: 'fake-comment' }] });
			});

			return client.get_review_comments({ full_repo: 'plip/plep', pr_nb: '123423112', review_id: 9876 }).then((response) => {
				expect(response).to.be.eql([{ id: 'fake-comment' }]);

				expect(raw_request_stub.firstCall.args[0]).to.be.eql(`/app/installations/${INSTALLATION_ID}/access_tokens`);
				expect(raw_request_stub.secondCall.args[0]).to.be.eql('/repos/plip/plep/pulls/123423112/reviews/9876/comments');
			});
		});

		it('should use cache if possible', () => {
			// setup
			GitHubAppClient.save_token_to_cache(INSTALLATION_ID, {
				token: 'fake-installation-token-1',
				expires_at: '2056-01-01T00:00:00.000Z'
			});

			raw_request_stub.onCall(0).callsFake(() => {
				return Promise.resolve({ data: [{ id: 'fake-comment-2' }] });
			});

			return client.get_review_comments({ full_repo: 'plip/plep', pr_nb: '123423112', review_id: 9876 }).then((response) => {
				expect(response).to.be.eql([{ id: 'fake-comment-2' }]);

				expect(raw_request_stub.firstCall.args[0]).to.be.eql('/repos/plip/plep/pulls/123423112/reviews/9876/comments');
			});
		});

		it('should drop cached token if expired', () => {
			// setup
			GitHubAppClient.save_token_to_cache(INSTALLATION_ID, {
				token: 'fake-installation-token-2',
				expires_at: '2005-01-01T00:00:00.000Z'
			});

			// Setup mocks
			raw_request_stub.onCall(0).callsFake(() => {
				return Promise.resolve({ data: { token: 'fake-access-token', expires_at: '2045-01-01T00:00:00.000Z' }});
			});

			raw_request_stub.onCall(1).callsFake(() => {
				return Promise.resolve({ data: [{ id: 'fake-comment-3' }] });
			});

			return client.get_review_comments({ full_repo: 'plip/plep', pr_nb: '123423112', review_id: 9876 }).then((response) => {
				expect(response).to.be.eql([{ id: 'fake-comment-3' }]);

				expect(raw_request_stub.firstCall.args[0]).to.be.eql(`/app/installations/${INSTALLATION_ID}/access_tokens`);
				expect(raw_request_stub.secondCall.args[0]).to.be.eql('/repos/plip/plep/pulls/123423112/reviews/9876/comments');
			});
		});

		it('should re-use preiviously stored token', () => {
			// No token

			// Setup mocks
			raw_request_stub.onCall(0).callsFake(() => {
				return Promise.resolve({ data: { token: 'fake-access-token', expires_at: '2045-01-01T00:00:00.000Z' }});
			});

			raw_request_stub.onCall(1).callsFake(() => {
				return Promise.resolve({ data: [{ id: 'fake-comment-4' }] });
			});

			raw_request_stub.onCall(2).callsFake(() => {
				return Promise.resolve({ data: [{ id: 'fake-comment-5' }] });
			});

			return client.get_review_comments({ full_repo: 'plip/plep', pr_nb: '123423112', review_id: 9876 }).then((response) => {
				expect(response).to.be.eql([{ id: 'fake-comment-4' }]);

				expect(raw_request_stub.firstCall.args[0]).to.be.eql(`/app/installations/${INSTALLATION_ID}/access_tokens`);
				expect(raw_request_stub.secondCall.args[0]).to.be.eql('/repos/plip/plep/pulls/123423112/reviews/9876/comments');

				return client.get_review_comments({ full_repo: 'plip/plep', pr_nb: 'fake-pr-2', review_id: 'review-1' });
			}).then((response2) => {
				expect(response2).to.be.eql([{ id: 'fake-comment-5' }]);
				expect(raw_request_stub.thirdCall.args[0]).to.be.eql('/repos/plip/plep/pulls/fake-pr-2/reviews/review-1/comments');
			});
		});
	});
});
