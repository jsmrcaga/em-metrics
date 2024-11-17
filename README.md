<h1 align="center">Engineering Management metrics</h1>

---

This repo is intended to be a replicable dpeloyment of a metrics "API".

This API should be able to provide different metrics to help teams grow,
such as DORA metrics & other interesting stuff.

This project supports multiple projects. It is based
on Prometheus, Grafana and SQLite. There is basic authentication supported, but no
permissions (if authenticated, you have access to everything).

These metrics are sent to prometheus, usually via an OTEL collector. The recent
Prometheus 3.0 release allows it to behave as an OTEL collector, but I personally
chose to go through Grafana Alloy.

---

## Metrics

### DORA metrics

* **Deployment frequency** (`deployment_frequency`)
	* Pretty self explanatory. This metric counts the number of deploys in a given time period.
	* _Directly forwarded to Prometheus as a counter_

* **Change failure rate** (`change_failure_count`)
	* This metric counts how many deploys end up in failures over a given time period. Usually 30 days
	* _Directly forwarded to Prometheus as a counter_

* **Lead time for changes** (`lead_time_for_changes`)
	* Time since the "first commit" until the deployment
	* The difficulty of following this metric is to get the "first commit" time.
	Thus, it's the CI/CD responsibility to give us this metric.
	 _Directly forwarded to Prometheus as a histogram_

* **Time to restore service** (`time_to_restore`)
	* This particular metric needs to be detected whenever an incident occurs,
	and when the recovery has taken place. According to "Software Architecture Metrics",
	counting rollbacks is OK.
	* This metric is a little bit more "manual", since it's hard to find a way to automate this process.
	If you're using something like incident.io or status pages, you might have a way to automate with webhooks
	_Directly forwarded to Prometheus as a histogram_


### Extra metrics

#### Incidents
* **Time to detect** (`time_to_detect`)
The time to detect incidents. This is calculated only for incidents linked to deployments.
The actual calculation is `incident.start_at - deployment.deployed_at` assuming that the deployment
will always be in the past.

* **Incident count** (`incident_count`)
The number of incidents. Since this is a counter, you can also get the rate.

* **Incident Restored** (`incident_restored`)
A counter for number of restored incidents. Will let you get the rate of resolution, should technically be 1.

* **Incident Finished** (`incident_finished`)
A counter of finished incidents. Similar to `incident_restored` but for finalized incidents


#### Deployments
* **Deployment duration** (`deployment_duration`)
This would tipically be the duration of a CD pipeline.
The calcuation is made after a deployment is marked as deployed, and corresponds to:
`deployment.deployed_at - deployment.deploy_start_at`

* **Deployment Started** (`deployment_started`)
A simple counter to count started deployments. Along with `deployment_frequency` (a counter too)
this can give you the rate of "failed" deployments (deployments which never reached "deployed" status,
most probable causes are failures on the CI/CD pipeline)
---



### Why ?
The idea of this project is to be as deployable as possible. This covers a myriad of different
organizations, every one of which have their own specificities on how they deploy infra.

If your organization is big enough, you probably already have some sort of telemetry collector setup,
and it's likely it is based on OTLP or Prometheus, and that you already have a collector setup (OTEL collector, 
Grafana Alloy for example). Meaning that you can run this project as a serverless function and point all API calls
and webhooks to that function. Your collector will handle the metrics and you can forget about everything else.

If your organization does not have a collector setup, you can benefit of the SQLite DB embedded in this project.

---

## Deploying this project

This repo comes with a `tf` folder. In this folder you will find all necessary resources
to deploy this in a Kubernetes cluster.

You can also "replicate" the kubernetes cluster setup, and deploy this as a `docker compose` project.
This repo has no serverless functions on purpose, so that the deployment is as easy as possible.

You can also technically run the project as a serverless function if needed, but you'll need a bit more manual intervention.
(Using this as a "library")

However, you only really need the actual code if you already have a Prometheus & Grafana instances somewhere.

### Getting metrics / Configuring your projects

The easiest way to configure your projects is to add one or two steps to your CI/CD pipeline.

You should add these steps on "deployment" pipeline only, so as to not pollute the data with
pull request runs.

There are 2 options:
* The easiest way is to add a step at the very start, that will `curl -X POST` on `/deployments`. This will create the
deployment for you and mark the "deployment_start_at". Then, at the end of your pipeline add another `curl -X POST` request to `/deployments/XXXX/deployed`.
This will mark the deployment as deployed and send the relevant metrics. 
In order to have your `id`s match, you can use something like the "run number" of your CI/CD operator. This will also help
with getting more data on the number of failed deploys

* The other way is to add a single step with `curl -X POST` on the final step of your CD pipeline.
The main difference is that you'll need to pass all of the info in this call. While `first_commit_at` might be as easy to find,
you'll need to get a value for `deploy_start_at`, and depending on your CI/CD operator this might be easy or not.


Finally, for incidents, the easiest way is for you to have some sort of webhooks or a CLI you can use.
You may be able to work around webhooks by using something like Zapier, and connecting it to something like `incident.io`. Or
if you keep track of your incidents in something like Notion, there's usually automations allowing to make HTTP requests.

---

## Configuration

### Environment Variables

| Name | Required | Default | Description |
|------|:--------:|:-------:|-------------|
| HOST | No | `0.0.0.0` | The host on which to listen. Depending on your config make sure to listen on a host able to communicate with the exterior |
| PORT | No | 3000 | The port on which the server should listen |
| SQLITE_DB | Yes | N/A | The SQLite DB file location. Make a volume for this ;) |
| CONFIG | No | N/A | The path for the config. Absolute paths will work best. You can make a volume for this. |
| OTEL_SERVICE_NAME | No | `em_metrics` | The "service" that will be used by OTEL. Prometheus will recognize this as the `job_name` |
| OTEL_COLLECTOR_URL | Yes | The URL of the OTEL collector to which to send the metrics |
| DEPLOYMENT_ENVIRONMENT | No | `NO_ENV` | The "environment" of the current deployment (usually `production`/`staging..`) |
| EM_METRICS_NO_AUTH | No | N/A (falsy) | If any value is set for this, auth will be disabled |
| EM_METRICS_TOKEN_AUTH | No | N/A (falsy) | The token used for token authentication |
| EM_METRICS_BASIC_AUTH_USERNAME | No | N/A (falsy) | The username used in basic authentication. Can be used without password (`password = ''`) |
| EM_METRICS_BASIC_AUTH_PASSWORD | No | N/A (falsy) | The password used in basic authentication. Can be used without username (`username = ''`) |
---

## Config

The configuration only allows adding teams for now, and affecting projects
and users to those teams.

* `projects` will be matched against the endpoints `project_id`.
* `users` will be matched against the `user` value from the endpoints (usually the GitHub/GitLab user)

Everything is optional, but this is the general shape:
```json
{
	"teams": {
		"backend-team": {
			"projects": ["backend-1", "serverless-1"],
			"users": ["bob", "jane"]
		},
		"front-end-team": {
			"projects": ["web-app", "mobile-app"],
			"users": ["lucy"]
		}
	}
}

```

## API

### API Authentication

Only basic auth and token are supported for now.

#### Pushing metrics

```sh
POST /deployments
```

Creates a deployment on DB and pushes the deployment "creation" on the metrics backend.

**Body**
```json
{
	"id": "<the deployment id | string | required>",
	"project_id": "<project id | string | required>",
	"first_commit_at": "<the date of the first commit, or the 'beginning' of the tracking | ISOString | rquired>",
	"deployed_at": "<the date of the deployment | ISOString | default: now>"	
}
```

```sh
POST /deployments/:deployment_id/deployed
```

Marks a deployment as "deployed", computes all necessary metrics (`deployment_duration`, `deployment_frequency` and `lead_time_for_changes`) and pushes them to the collector.

This endpoint can work in "standalone" mode, without having created the deployment first, if you pass `create_if_not_exists` to `true`.
You'll need to define the dates manually though and the `deployment_id` will be inferred from the URL path.

**Body**
```json
{
	"create_if_not_exists": "<if this endpoint should create the deployment too | boolean | required>",

	"project_id": "<project id | string | required if create_if_not_exists>",
	"first_commit_at": "<the date of the first commit, or the 'beginning' of the tracking | ISOString | rquired if create_if_not_exists>",
	"deployed_at": "<the date of the deployment | ISOString | default: now>"	
}
```

```sh
POST /incidents
```

Creates a new incident. Can be started/resolved/finished. If finished, it will be resolved as well.

**Body**
```json
{
	"id": "<the incident id | string | default: incident_<project_id>_X with X = number of incidents >",
	"project_id": "<project id | string | required>",
	"deployment_id": "<the associated deployment_id. | string | not required>",
	"started_at": "<the date of the deployment | ISOString | default: now>",
	"restored_at": "<the date at which the incident was restored for users. Rollbacks count ;) | ISOString | not required if not restored>",
	"finished_at": "<the date at which the incident was finished completely (fixed or closed) | ISOString | not required if not finished>"
}
```

```sh
GET /incidents
```

Gets the list of incidents.

**Query**
```json
{
	"type": "<'in-progress'| If the endpoint should only return ongoing incidents (not restored) | optional>",
}
```

```sh
POST /incidents/:incident_id/restored
```

Marks an incident as `restored`.

**Body**
```json
{
	"date": "<the date at which the incident was restored for users. Rollbacks count ;) | ISOString | default: now>",
}
```


```sh
POST /incidents/:incident_id/finished
```

Marks the incident as both finished and restored (if it was not already)

**Body**
```json
{
	"date": "<the date at which the incident was finished completely (fixed or closed) | ISOString | default: now>",
}
```

---

## Possible Improvements

### Metrics
* SPACE metrics
	* Create polls and stuff to get SPACE data

### Features
* Project management
* SSO
* Permissions

---
