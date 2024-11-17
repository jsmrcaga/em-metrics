class Teams {
	constructor(teams={}) {
		this.teams = teams;

		const { teams_by_project, teams_by_user } = Object.entries(teams).reduce((agg, [team_name, { projects=[], users=[] }]) => {
			for(const project of projects) {
				agg.teams_by_project[project] = agg.teams_by_project[project] || [];
				agg.teams_by_project[project].push(team_name);
			}

			for(const user of users) {
				agg.teams_by_user[user] = agg.teams_by_user[user] || [];
				agg.teams_by_user[user].push(team_name);
			}

			return agg;
		}, { teams_by_project: {}, teams_by_user: {} })

		this.teams_by_project = teams_by_project;
		this.teams_by_user = teams_by_user;
	}

	get_team_from_context({
		username,
		project_id
	}={}) {
		const project_team = this.teams_by_project[project_id];
		if(project_team?.length === 1) {
			return project_team[0];
		}

		const user_team = this.teams_by_user[username];

		if(user_team?.length === 1){
			return user_team[0];
		}

		if(!project_team?.length && !user_team?.length) {
			return undefined;
		}

		const intersection = new Set(project_team).intersection(new Set(user_team));
		if(intersection.size === 1) {
			return Array.from(intersection)[0];
		}

		return undefined;
	};
}

module.exports = {
	Teams
}
