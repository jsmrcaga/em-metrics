const { default_db, SqliteMigrator } = require('@jsmrcaga/sqlite3-orm');
const { config } = require('../src/config');

before(() => {
	return default_db.init(process.env.SQLITE_DB).then(() => {
		// Migrate everything
		const migrator = new SqliteMigrator({
			db: default_db,
			migrations_directory: './src/models/migrations'
		});

		if(process.env.EM_METRICS_TEST_MIGRATION_LOGS) {
			migrator.on('plan-complete', (...args) => {
				console.log('MRIATION PLAN', ...args);
			});
			migrator.on('migrated-file', (...args) => {
				console.log('MIGRATED FILE', ...args);
			});

			migrator.on('statement-error', (...args) => {
				console.log('ERROR', ...args);
			});

			migrator.on('statement-complete', (...args) => {
				console.log('STATEMENT', ...args);
			});
		}

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
