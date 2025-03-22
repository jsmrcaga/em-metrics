// @docs: https://open-telemetry.github.io/opentelemetry-js/
const { Meter } = require('../meter');
const { MeterProvider, PeriodicExportingMetricReader, ConsoleMetricExporter } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { Resource } = require('@opentelemetry/resources');

const exporter = new OTLPMetricExporter({
	url: process.env.OTEL_COLLECTOR_URL,
	headers: {},
	concurrencyLimit: 2
});

const periodic_reader = new PeriodicExportingMetricReader({
	exporter,
	exportIntervalMillis: 250
});

const flush = () => {
	return periodic_reader.flush();
};

const environment = process.env.DEPLOYMENT_ENVIRONMENT || 'NO_ENV';
const meter_provider = new MeterProvider({
	readers: [periodic_reader],
	resource: new Resource({
		'environment': environment,
	})
});

const main_meter = meter_provider.getMeter('main');

class OTELMeter extends Meter {
	// @see https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api.MetricOptions.html
	Counter(name, options={}) {
		return main_meter.createCounter(name, options);
	}

	Histogram(name, options={}) {
		return main_meter.createHistogram(name, options);
	}

	Gauge(name, options={}) {
		return main_meter.createGauge(name, options);
	}
}

const otel_meter = new OTELMeter();

module.exports = {
	OTELMeter,
	otel_meter,
	flush
};
