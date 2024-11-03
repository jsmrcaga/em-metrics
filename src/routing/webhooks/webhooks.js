module.exports = (server, options, done) => {
	server.post('/webhooks/magic', (req, res, next) => {
		// Receive a random webhook
		// Apply user defined filters
		// Apply user defined actions
		//	- create incident (start, end, resolved)
		//	- create deployment
		
	});
}
