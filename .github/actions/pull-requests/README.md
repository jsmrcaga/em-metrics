# EM Metrics Actions for Pull Requests

## Configuring

```yml
name: EM Metrics for PRs

on:
	pull_request:
		types:
			- opened
			- closed
	pull_request_review:
		types:
			- submitted

jobs:
	track_metrics:
		runs-on: ubuntu-latest

		steps:
			- uses: jsmrcaga/em-metrics/.github/actions/pull-requests@v0.0.15
			  with:
				token: ${{ secrets.EM_METRICS_SECRET }}
				team_id: TEAM_01

```

## Multiple teams

Most of the configuration is the same, but we add an extra step to find the team.

This step can be whatever you want.

```yml
name: EM Metrics for PRs

on:
	pull_request:
		types:
			- opened
			- closed
	pull_request_review:
		types:
			- submitted

jobs:
	track_metrics:
		runs-on: ubuntu-latest

		steps:
			- run: ./get-team.sh
			  id: find-team

			- uses: jsmrcaga/em-metrics/.github/actions/pull-requests@v0.0.15
			  with:
				token: ${{ secrets.EM_METRICS_SECRET }}
				team_id: ${{ steps.find-team.outputs.team_id }}

```
