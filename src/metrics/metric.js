const { meter } = require('../remote-metrics');

const METRIC_TYPES = {
	GAUGE: 'GAUGE',
	HISTOGRAM: 'HISTOGRAM',
	COUNTER: 'COUNTER'
};

// for some reason I could not manage to make this work "globally"
// so hacking it here
const environment = process.env.DEPLOYMENT_ENVIRONMENT || 'NO_ENV';

class Metric {
	#instrument = null;

	static METRIC_TYPE = METRIC_TYPES.COUNTER;

	static get_instrument(name, options={}) {
		switch(this.METRIC_TYPE) {
			case METRIC_TYPES.COUNTER:
				return meter.Counter(name, options);
			case METRIC_TYPES.HISTOGRAM:
				return meter.Histogram(name, options);
			case METRIC_TYPES.GAUGE:
				return meter.Gauge(name, options);
			default:
				throw new Error(`Unknown metric type: ${this.METRIC_TYPE}`);
		}
	}

	constructor(name, options) {
		this.name = name;
		this.#instrument = this.constructor.get_instrument(name, options);
	}

	increment(attributes={}, context) {
		return this.add(1, {
			environment,
			...attributes
		}, context);
	}

	add(value=1, attributes={}, context) {
		// if(!(this.#instrument instanceof meter.Counter)) {
		// 	throw new Error('Can only increment Counters');
		// }

		if(value instanceof Object) {
			attributes = value;
			value = 1;
		}

		this.#instrument.add(value, {
			environment,
			...attributes
		}, context);
	}

	record(value, attributes={}, context) {
		// if(this.instrument instanceof meter.Counter) {
		// 	throw new Error('Can only record Histograms or Gauges');
		// }

		this.#instrument.record(value, {
			environment,
			...attributes
		}, context);
	}
}

module.exports = {
	Metric,
	METRIC_TYPES
};
