module.exports = (server, options, done) => {
	server.register(require('./github'), {
		prefix: '/github'
	});

	done();
};
