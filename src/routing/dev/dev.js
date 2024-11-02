const { otel_meter } = require('../../remote-metrics/open-telemetry');

module.exports = (server, options, done) => {
	if(!process.env.DEV_ROUTES) {
		return done();
	}

	server.post('/ping', () => {
		const counter = otel_meter.Counter('counter_jo');
		counter.add(1);
		return {};
	});

	done();
}
