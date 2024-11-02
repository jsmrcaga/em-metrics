CREATE TABLE IF NOT EXISTS deployments (
	id TEXT PRIMARY KEY,
	project_id TEXT DEFAULT NULL,

	deploy_start_at TEXT DEFAULT CURRENT_TIMESTAMP,
	deployed_at TEXT DEFAULT CURRENT_TIMESTAMP,
	first_commit_at TEXT DEFAULT NULL
);;

CREATE TABLE IF NOT EXISTS incidents (
	id TEXT PRIMARY KEY,
	project_id TEXT DEFAULT NULL,
	deployment_id TEXT DEFAULT NULL,

	started_at TEXT DEFAULT CURRENT_TIMESTAMP,
	restored_at TEXT DEFAULT NULL,
	finished_at TEXT DEFAULT NULL,

    FOREIGN KEY (deployment_id) REFERENCES deployments(id)
);;
