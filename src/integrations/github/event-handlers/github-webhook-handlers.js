class GitHubWebhookHandlers {
	static #handlers = new Map();

	static register(...HandlerClasses) {
		for(const HandlerClass of HandlerClasses) {
			this.#handlers.set(HandlerClass.EVENT_NAME, HandlerClass);
		}
	}

	static is_event_allowed({ event_type, teams, event, headers }) {
		if(!this.#handlers.has(event_type)) {
			return false;
		}

		return this.#handlers.get(event_type).is_allowed({ teams, event, headers });
	}

	static handle({ teams, github_client }, { event_type, event, headers }) {
		const HandlerClass = this.#handlers.get(event_type);

		const handler = new HandlerClass({ github_client, teams });
		return handler.handle(event, headers);
	}
}

module.exports = {
	GitHubWebhookHandlers
};
