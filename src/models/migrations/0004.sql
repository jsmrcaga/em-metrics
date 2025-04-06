CREATE TABLE IF NOT EXISTS pull_requests (
	id TEXT PRIMARY KEY,
	team_id TEXT,

	opened_at TEXT DEFAULT NULL,
	closed_at TEXT DEFAULT NULL,
	merged_at TEXT DEFAULT NULL,
	first_review_at TEXT DEFAULT NULL,
	nb_comments INT DEFAULT NULL,
	nb_reviews INT DEFAULT 0
);;
