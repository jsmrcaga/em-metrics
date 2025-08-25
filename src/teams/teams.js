class Teams {
	constructor(teams={}) {
		this.teams = teams;

		const {
			teams_by_project,
			teams_by_email,
			teams_by_github_username,
			users_by_github_username,
			users_by_email
		} = Object.entries(teams).reduce((agg, [team_name, { projects=[], users=[] }]) => {
			// Used for non-user triggered actions
			for(const project of projects) {
				if(agg.teams_by_project.has(project)) {
					agg.teams_by_project.get(project).push(team_name);
				} else {
					agg.teams_by_project.set(project, [team_name]);
				}
			}

			// Used for User triggered actions via GitHub
			for(const { github_username } of users) {
				if(agg.teams_by_github_username.has(github_username)) {
					agg.teams_by_github_username.get(github_username).push(team_name);
				} else {
					agg.teams_by_github_username.set(github_username, [team_name]);
				}
			}

			// Used for User triggered actions via Linear or other email accounts
			for(const user of users) {
				const { email, github_username } = user;
				if(agg.teams_by_email.has(email)) {
					agg.teams_by_email.get(email).push(team_name);
				} else {
					agg.teams_by_email.set(email, [team_name]);
				}

				agg.users_by_email.set(email, user);
				agg.users_by_github_username.set(github_username, user);
			}

			return agg;
		}, {
			teams_by_project: new Map(),
			teams_by_github_username: new Map(),
			teams_by_email: new Map(),
			users_by_github_username: new Map(),
			users_by_email: new Map()
		})

		this.teams_by_project = teams_by_project;
		this.teams_by_github_username = teams_by_github_username;
		this.teams_by_email = teams_by_email;

		this.users_by_github_username = users_by_github_username;
		this.users_by_email = users_by_email;
	}

	get_team_from_context({
		// username for retrocomp
		username,
		github_username,
		project_id
	}={}) {
		const project_team = this.teams_by_project.get(project_id);
		if(project_team?.length === 1) {
			return project_team[0];
		}

		const user_teams = this.teams_by_github_username.get(username || github_username);

		if(user_teams?.length === 1){
			return user_teams[0];
		}

		if(!project_team?.length && !user_teams?.length) {
			return undefined;
		}

		const intersection = new Set(project_team).intersection(new Set(user_teams));
		if(intersection.size === 1) {
			return Array.from(intersection)[0];
		}

		return undefined;
	};

	is_user_valid({ github_username, email }) {
		const github_user = this.users_by_github_username.has(github_username);
		const email_user = this.users_by_email.has(email);

		return github_user || email_user;
	}
}

module.exports = {
	Teams
}
