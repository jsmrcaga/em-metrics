const { Model, DoesNotExist } = require('@jsmrcaga/sqlite3-orm');

class Webhook extends Model {
	static TABLE_NAME = 'webhooks';

	static SCHEMA = {
		// id is required because it's computed beforehand
		id: { type: 'string', primary_key: true, required: true },
		integration: {  type: 'string', enum:['github'], required: true },
		payload: { type: 'string' },
		headers: { type: 'string', default: '{}' },
		status: {  type: 'string', enum:['TODO', 'IN_PROGRESS', 'DONE', 'ERROR'], required: true, default: 'TODO' },
	};

	static to_handle({ integration=null }) {
		return Webhook.objects.all(`
			SELECT
				*
			FROM
				webhooks AS w
			WHERE
				w.status = 'TODO'
			${
				integration ? 'AND INTEGRATION = ?' : ''
			}
		`, [integration]);
	}
}

module.exports = {
	Webhook
};
