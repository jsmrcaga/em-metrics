CREATE TABLE IF NOT EXISTS tickets (
	id TEXT PRIMARY KEY,
	team_id TEXT,
	project_id TEXT,

	created_at TEXT DEFAULT CURRENT_TIMESTAMP,
	started_at TEXT DEFAULT NULL,
	finished_at TEXT DEFAULT NULL,

	parent_ticket_id TEXT DEFAULT NULL,
	actor_hash TEXT DEFAULT NULL,
	ticket_type TEXT DEFAULT 'unknown',
	status TEXT DEFAULT 'BACKLOG',

	current_estimation NUMBER DEFAULT NULL,
	initial_estimation NUMBER DEFAULT NULL,
	final_estimation NUMBER DEFAULT NULL
);;
