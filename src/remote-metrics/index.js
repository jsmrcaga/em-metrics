const { otel_meter, flush } = require('./open-telemetry');

// default export for all app
module.exports = {
	meter: otel_meter,
	flush
};
