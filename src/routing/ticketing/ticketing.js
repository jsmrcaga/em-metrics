const Crypto = require('node:crypto');
const { Ticket } = require('../../models/ticket');
const { CSVFormatter } = require('../../helpers/csv/formatter');

module.exports = (server, options, done) => {
	server.post('/stats', {
		schema: {
			body: {
				type: 'object',
				properties: {
					from: { type: 'string', format: 'isodate' },
					to: { type: 'string', format: 'isodate' },
					unhash_actors: {
						type: 'array',
						minItems: 1,
						uniqueItems: true,
						items: { type: 'string', format: 'email' }
					}
				}
			},
			querystring: {
				type: 'object',
				properties: {
					format: {
						type: 'string',
						enum: ['json', 'csv']
					}
				}
			}
		}
	}, (req, reply) => {
		// Expected result
		// For every month, % of time actor spent on a project
		// {
		// 	'2025-07-01': {
		// 		'actor-1': {
		// 			'project-1' : '15%',
		// 			'project-2' : '85%'
		// 		}
		// 	}
		// }

		const six_civil_months_ago = new Date();
		six_civil_months_ago.setMonth(six_civil_months_ago.getMonth() - 6);
		six_civil_months_ago.setDate(1);
		six_civil_months_ago.setHours(0, 0, 0, 0);

		const six_months_later = new Date(six_civil_months_ago.getTime());
		six_months_later.setMonth(six_months_later.getMonth() + 6);

		let {
			from = six_civil_months_ago.toISOString(),
			to = six_months_later.toISOString(),
			unhash_actors = []
		} = req.body;

		const actor_hashmap = unhash_actors.reduce((acc, email) => {
			const hashed = Ticket.hash_actor_email(email);
			acc[hashed] = email;
			return acc;
		}, {
			// special case for empty string
			// in ideal case should be handled _before storing_
			// but now we can just always hash/unhash
			'47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=': 'no-actor'
		});

		// TODO: add stats by project too with another WITH & JOIN clause
		return Ticket.DB.all(`
			WITH time_spent_per_actor_per_month AS (
				SELECT
					COUNT(*) AS ticket_count,
					t.actor_hash AS actor_hash,
					strftime('%Y-%m-01', t.created_at) AS month,
					SUM(t.current_estimation) AS actor_monthly_estimation,
					SUM(strftime('%s', t.finished_at) - strftime('%s', COALESCE(t.started_at, t.created_at))) AS actor_monthly_time
				FROM
					tickets AS t
				WHERE
					COALESCE(t.started_at, t.created_at) >= ? AND t.finished_at <= ? AND t.finished_at IS NOT NULL
				GROUP BY
					month,
					actor_hash
			)

			SELECT
				tsp.ticket_count AS actor_monthly_ticket_count,
				COUNT(*) AS actor_monthly_project_ticket_count,
				(COUNT(*) / (tsp.ticket_count * 1.0)) AS actor_monthly_project_ticket_percent,
				t.actor_hash AS actor_hash,
				tsp.actor_monthly_estimation,
				tsp.actor_monthly_time,
				t.project_id AS project_id,
				strftime('%Y-%m-01', t.created_at) AS month,
				SUM(t.current_estimation) AS sum_month_project_estimation,
				(SUM(t.current_estimation) / (tsp.actor_monthly_estimation * 1.0)) AS percent_month_project_estimation,
				SUM(strftime('%s', t.finished_at) - strftime('%s', COALESCE(t.started_at, t.created_at))) AS sum_month_project_time_spent_seconds,
				(SUM(strftime('%s', t.finished_at) - strftime('%s', COALESCE(t.started_at, t.created_at))) / (tsp.actor_monthly_time * 1.0)) AS percent_month_project_time_spent_seconds
			FROM
				tickets AS t
			LEFT JOIN
				time_spent_per_actor_per_month AS tsp ON
					tsp.actor_hash = t.actor_hash AND strftime('%Y-%m-01', t.created_at) = tsp.month
			WHERE
				COALESCE(t.started_at, t.created_at) >= ? AND t.finished_at <= ? AND t.finished_at IS NOT NULL
			GROUP BY
				month,
				t.project_id,
				t.actor_hash
			ORDER BY
				month ASC,
				t.project_id ASC,
				t.actor_hash ASC;
		`, [from, to, from, to]).then(rows => {
			const actor_project_month_groups = rows;
			const { format='json' } = req.query;

			if(format === 'csv') {
				const csv_formatter = new CSVFormatter();
				return csv_formatter.format(rows);
			}

			// format === json
			const summary = rows.reduce((acc, row) => {
				const {
					month,
					actor_hash,
					project_id,
					actor_monthly_ticket_count,
					actor_monthly_project_ticket_count,
					actor_monthly_project_ticket_percent,
					actor_monthly_time,
					actor_monthly_estimation,
					sum_month_project_estimation,
					percent_month_project_estimation,
					sum_month_project_time_spent_seconds,
					percent_month_project_time_spent_seconds
				} = row;

				acc[month] = acc[month] || {
					by_actor: {},
					// by_project: {}
				};

				// Translate hash into actual email if provided
				const actor_email = actor_hashmap[actor_hash] || actor_hash;

				// By Actor
				acc[month]['by_actor'][actor_email] = acc[month]['by_actor'][actor_email] || {
					actor_monthly_time,
					actor_monthly_estimation,
					actor_monthly_ticket_count,
					projects: {}
				};

				acc[month]['by_actor'][actor_email]['projects'][project_id] = {
					sum_month_project_estimation,
					percent_month_project_estimation,
					sum_month_project_time_spent_seconds,
					percent_month_project_time_spent_seconds,
					actor_monthly_project_ticket_count,
					actor_monthly_project_ticket_percent,
				};

				// By project
				// @todo: should inverse the stats
				// acc[month]['by_project'][project_id] = acc[month]['by_project'][project_id] || {
				// 	actors: {}
				// };

				// acc[month]['by_project'][project_id]['actors'][actor_email] = {
				// 	sum_month_project_estimation,
				// 	percent_month_project_estimation,
				// 	sum_month_project_time_spent_seconds,
				// 	percent_month_project_time_spent_seconds
				// };

				return acc;
			}, {});

			return {
				from,
				to,
				summary
			};
		});
	});

	done();
};
