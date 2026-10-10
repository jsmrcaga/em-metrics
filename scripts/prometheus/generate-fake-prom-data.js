// Import with promtool
// 1. Generate blocks
// 2. Import data

const { DORA, TICKETING, CORE4 } = require('../../src/metrics');

const three_months_ago = new Date();
three_months_ago.setMonth(three_months_ago.getMonth() - 3);

const DURATION_TEN_MINUTES = 1000 * 60 * 10;


/**
 * @class OpenMetric
 * @property {Metric} metric
 */
class OpenMetricExporter {
	constructor(metric) {
		this.metric = metric;
	}

	/**
	 * Turns an object into label list
	 */
	stringify_labels() {
		const values = Object.entries(this.labels).map(([k, v]) => {
			return `${k}="${v}"`;
		});

		return `{${values.join(',')}}`
	}

	openMetricHeader() {

	}

	generate_counter() {
		const labels = this.stringify_labels(labels);
		const lines = [`${this.name}{${labels}} ${value} ${time_ms}`];
		return lines;
	}

	generate_gauge() {

	}

	generate_histogram() {

	}

	generate({ labels, time_ms, value }) {
		if(!name || !labels || !time_ms || !value) {
			throw new Error('Bad open metric value');
		}
	}
}

function generate_counter(metric, value, labels={}, time_ms) {
	
}

function generate_histogram(metric, value, labels={}, time_ms) {

}

function generate_gauge(metric, value, labels={}, time_ms) {

}

const GENERATORS = {
	[Counter]: generate_counter,
	[Histogram]: generate_histogram,
	[Gauge]: generate_gauge
};

function generate_metric(metric, value, attributes={}, time_ms) {
	const generator = GENERATORS[metric.constructor];
	return generator(metric, value, attributes, time_ms);
}

/**
 * Returns a random item from an array
 */
function rand(arr=[]) {
	return arr[Math.floor(Math.random() * arr.length);]
}

/**
 * Checks if pull request metrics should be sent in this 10 min block
 * @return {string[]} List of metrics
 */
function tick_10_min_pull_request() {

}

/**
 * Checks if pull ticketing metrics should be sent in this 10 min block
 * @return {string[]} List of metrics
 */
function tick_10_min_ticketing(time_ms, results=null) {
	// Rougly 2 tickets per day
	const probability_done_per_10_min = 0.004;

	// Roughly 1 ticket changes estimation per week
	const probability_estimation_changed_per_10_min = 0.0004;

	results = results || {
		ticket_count: [],
		ticket_estimation_changed: []
	};

	if(Math.random() < probability_done_per_10_min) {
		const is_cs = Math.random() < 0.1;
		results.ticket_count.push(new OpenMetric({
			name: 'ticket_count',
			value: 1,
			labels: {
				team_id: 'team-1',
				project_id: rand(['tp-1', 'tp-2', 'tp-3', 'tp-4', 'tp-5', 'tp-6']),
				ticket_type: rand(['tt-1', 'tt-2', 'tt-3', 'tt-4', 'tt-5', 'tt-6']),
				customer_support_type: is_cs ? rand(['cs-1', 'cs-2', 'cs-3']) : null
				is_customer_support: is_cs
			},
			time_ms
		}))
	}

	if(Math.random() < probability_estimation_changed_per_10_min) {
		results.ticket_estimation_changed.push(new OpenMetric({
			name: 'ticket_estimation_changed',
			value: Math.floor(Math.random() * 6),
			labels: {
				team_id: 'team-1',
				project_id: rand(['tp-1', 'tp-2', 'tp-3', 'tp-4', 'tp-5', 'tp-6']),
				ticket_type: rand(['tt-1', 'tt-2', 'tt-3', 'tt-4', 'tt-5', 'tt-6']),
				customer_support_type: is_cs ? rand(['cs-1', 'cs-2', 'cs-3']) : null
				is_customer_support: is_cs
			},
			time_ms
		}))
	}
}

/**
 * Checks if dora metrics should be sent in this 10 min block
 * @return {string[]} List of metrics
 */
function tick_10_min_dora() {

}

function objectify(open_metrics=[]) {
	return open_metrics.reduce((agg, metric) => {
		if(!agg[metric.name]) {
			agg[metric.name] = [];
		}

		agg[metric.name].push(metric);
	}, {});
}

/**
 * Generates a block of prometheus metrics going back 3 months
 * It will generate most of the metrics tracked in this repo.
 * It goes back 3 months and advances time in 10 min intervals,
 * then randomly checks if a metric will be sent, picks a realistic
 * value for it, and registers it in the list. Then the file is 
 * formatted and written to disk.
 * Skips weekends
 * 
 * @example
 * # HELP http_requests_total Total HTTP requests
 * # TYPE http_requests_total counter
 * http_requests_total{method="GET",endpoint="/api/v1/users",status="200"} 1520 1717372800000
 * http_requests_total{method="GET",endpoint="/api/v1/users",status="200"} 1640 1717376400000
 */
function generate_data({ since=three_months_ago, until=new Date(), stream=false } = {}) {
	const metrics = {
		dora: {},
		ticketing: {},
		prs: {}
	};

	// Loop every 10 minutes
	for(const i = since.getTime(); i < until.getTime(); i += DURATION_TEN_MINUTES) {
		const date = new Date(i);

		// Skip 7pm -> 7am
		const current_hours = date.getHours();
		const current_day = date.getDay();
		if(date.getHours() > 19 || date.getHours() < 7) {
			// if it's 19h or later, we want to set the time to 19h + 7 so we skip a day
			// otherwise we just "advance" the clock to 7 am (because it's before 7am)
			seven_am = date.setHours(current_hours > 19 ? current_hours + 7 : 7);

			// if we don't substract it, the condiition in the for loop
			// will re-add it, and we will have skipped that loop
			i = seven_am.getTime() - DURATION_TEN_MINUTES;
			continue;
		}

		// Skip weekends
		if([0, 6].includes(current_day)) {
			const monday = date.setDate(date.getDate() + (current_day === 0 ? 1 : 2));
			i = monday.getTime() - DURATION_TEN_MINUTES;
			continue;
		}

		const pr_metrics = tick_10_min_pull_request();
		const ticketing_metrics = tick_10_min_ticketing();
		const dora_metrics = tick_10_min_dora();

		metrics.dora.push(...dora_metrics);
		metrics.ticketing.push(...ticketing_metrics);
		metrics.prs.push(...pr_metrics);
	}


}

