function mock_env(env = {}) {
	for(const [k, v] of Object.entries(env)) {
		process.env[k] = v;
	}
}

function clear_env(env = {}) {
	for(const k of Object.keys(env)) {
		delete process.env[k];
	}
}

module.exports = {
	mock_env,
	clear_env
};
