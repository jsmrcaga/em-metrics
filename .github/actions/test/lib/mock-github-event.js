function mock_github_event(stub, event_name, event_type, other={}){
	process.env.GITHUB_EVENT_NAME = event_name;

	stub.callsFake(() => {
		return JSON.stringify({
			action: event_type,
			...other
		});
	});
};

function clear_github_event_mock(stub) {
	stub.restore();
};

module.exports = {
	mock_github_event,
	clear_github_event_mock
};
