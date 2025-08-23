const { expect } = require('chai');
const { Teams } = require('../../src/teams/teams');

describe('Teams', () => {
	describe('No config', () => {
		it('should all be empty', () => {
			const teams = new Teams();
			expect(teams.teams).to.eql({});
			expect(teams.teams_by_project.size).to.eql(0);
			expect(teams.teams_by_email.size).to.be.eql(0);
			expect(teams.teams_by_github_username.size).to.eql(0);
		});
	});

	describe('Only projects', () => {
		it('should have a single project + team', () => {
			const teams = new Teams({
				'test-team': {
					projects: ['project-1']
				}
			});

			expect(teams.teams_by_github_username.size).to.eql(0);
			expect(teams.teams_by_email.size).to.be.eql(0);
			expect(Object.fromEntries(teams.teams_by_project.entries())).to.eql({
				'project-1': ['test-team']
			});
		});

		it('should have a single project + team + empty users', () => {
			const teams = new Teams({
				'test-team': {
					projects: ['project-1'],
					users: []
				}
			});

			expect(teams.teams_by_github_username.size).to.eql(0);
			expect(teams.teams_by_email.size).to.be.eql(0);
			expect(Object.fromEntries(teams.teams_by_project.entries())).to.eql({
				'project-1': ['test-team']
			});
		});

		it('should handle multiple projects per team', () => {
			const teams = new Teams({
				'test-team': {
					projects: ['project-1', 'project-2']
				}
			});

			expect(teams.teams_by_github_username.size).to.eql(0);
			expect(teams.teams_by_email.size).to.be.eql(0);
			expect(Object.fromEntries(teams.teams_by_project.entries())).to.eql({
				'project-1': ['test-team'],
				'project-2': ['test-team'],
			});
		});

		it('should handle multiple teams per projects', () => {
			const teams = new Teams({
				'test-team': {
					projects: ['project-1', 'project-2']
				},
				'team-2': {
					projects: ['project-3', 'project-1']
				}
			});

			expect(teams.teams_by_github_username.size).to.eql(0);
			expect(teams.teams_by_email.size).to.be.eql(0);
			expect(Object.fromEntries(teams.teams_by_project.entries())).to.eql({
				'project-1': ['test-team', 'team-2'],
				'project-2': ['test-team'],
				'project-3': ['team-2']
			});
		});
	});

	describe('Only users', () => {
		it('should have a single user + team', () => {
			const teams = new Teams({
				'test-team': {
					users: [{
						email: 'user-1'
					}]
				}
			});

			expect(Object.fromEntries(teams.teams_by_project.entries())).to.eql({});
			expect(Object.fromEntries(teams.teams_by_email.entries())).to.eql({
				'user-1': ['test-team']
			});
		});

		it('should have a single user + team + empty projects', () => {
			const teams = new Teams({
				'test-team': {
					projects: [],
					users: [{
						email: 'user-1'
					}]
				}
			});

			expect(Object.fromEntries(teams.teams_by_project.entries())).to.eql({});
			expect(Object.fromEntries(teams.teams_by_email.entries())).to.eql({
				'user-1': ['test-team']
			});
		});

		it('should handle multiple users per team', () => {
			const teams = new Teams({
				'test-team': {
					users: [{
						email: 'user-1'
					}, {
						email: 'user-2'
					}]
				}
			});

			expect(Object.fromEntries(teams.teams_by_project.entries())).to.eql({});
			expect(Object.fromEntries(teams.teams_by_email.entries())).to.eql({
				'user-1': ['test-team'],
				'user-2': ['test-team'],
			});
		});

		it('should handle multiple teams per users', () => {
			const teams = new Teams({
				'test-team': {
					users: [{ email: 'user-1' }, { email: 'user-2' }]
				},
				'team-2': {
					users: [{ email: 'user-3' }, { email: 'user-1' }]
				}
			});

			expect(Object.fromEntries(teams.teams_by_project.entries())).to.eql({});
			expect(Object.fromEntries(teams.teams_by_email.entries())).to.eql({
				'user-1': ['test-team', 'team-2'],
				'user-2': ['test-team'],
				'user-3': ['team-2']
			});
		});
	});

	describe('Full conf', () => {
		it('should handle mutliple users/projects per team', () => {
			const teams = new Teams({
				'test-team': {
					users: [{ email: 'user-1' }, { email: 'user-2' }],
					projects: ['p1', 'p2']
				},
				'team-2': {
					users: [{ email: 'user-3' }, { email: 'user-1' }, { email: 'user-5' }],
					projects: ['p2', 'p5']
				}
			});

			expect(Object.fromEntries(teams.teams_by_email.entries())).to.eql({
				'user-1': ['test-team', 'team-2'],
				'user-2': ['test-team'],
				'user-3': ['team-2'],
				'user-5': ['team-2']
			});
			expect(Object.fromEntries(teams.teams_by_project.entries())).to.eql({
				'p1': ['test-team'],
				'p2': ['test-team', 'team-2'],
				'p5': ['team-2']
			});
		});
	});

	describe('Get team from context', () => {
		const teams = new Teams({
			'test-team': {
				users: [{ github_username: 'user-1' }, { github_username: 'user-2' }],
				projects: ['p1', 'p2']
			},
			'team-2': {
				users: [{ github_username: 'user-3' }, { github_username: 'user-1' }, { github_username: 'user-5' }],
				projects: ['p2', 'p5']
			}
		});

		it('should return null if no context given', () => {
			const team = teams.get_team_from_context({});
			expect(team).to.be.undefined;
		});

		it('should find team by user', () => {
			const team = teams.get_team_from_context({ username: 'user-3' });
			expect(team).to.eql('team-2');
		});

		it('should find team by project', () => {
			const team = teams.get_team_from_context({ project_id: 'p1' });
			expect(team).to.eql('test-team');
		});

		it('should find team by intersection', () => {
			// project = team-1 and team-2, user = team2
			const team = teams.get_team_from_context({ project_id: 'p2', username: 'user-5' });
			expect(team).to.eql('team-2');
		});

		it('should not find by intersection', () => {
			// project and user = test-team & team-2
			const team = teams.get_team_from_context({ project_id: 'p2', username: 'user-1' });
			expect(team).to.be.undefined;
		});
	});
});
