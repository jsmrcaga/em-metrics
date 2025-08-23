const { default_db, SqliteMigrator } = require('@jsmrcaga/sqlite3-orm');
const { config } = require('../src/config');

before(() => {
	return default_db.init(process.env.SQLITE_DB).then(() => {
		// Migrate everything
		const migrator = new SqliteMigrator({
			db: default_db,
			migrations_directory: './src/models/migrations'
		});

		return migrator.migrate();
	});
});

beforeEach(() => {
	return default_db.clear();
});

afterEach(() => {
	// Config is a singleton, so we reset
	// just in case
	config.reset();
});

beforeEach(() => {
	// allows calling the API without auth
	process.env.EM_METRICS_NO_AUTH = true;
});
