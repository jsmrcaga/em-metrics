const pino = require('pino');

class Logger {
	constructor({ level='info' }={}) {
		const pino_options = this.constructor.get_pino_config();
		this.logger = pino(pino_options);
	}

	get log() {
		return this.logger;
	}

	static get_pino_config({ level='info' }={}) {
		const should_log = process.env.NODE_ENV !== 'test';

		let pino_options = {
			level: should_log ? level : 'silent',
			errorKey: 'error',
			formatters: {
				level: (label) => ({ level: label })
			},
		};

		// Checking for pino_options re-checks that we are allowed to log
		if(pino_options && process.env.NODE_ENV !== 'production') {
			pino_options = {
				...pino_options,
				transport: {
					target: 'pino-pretty',
					options: {
						colorize: true
					}
				}
			};
		}

		return pino_options;
	}
}

// @todo: add level later as envvar
const logger = new Logger();

module.exports = {
	Logger,
	logger
};
