const LOG_LEVELS = {
	NONE: 0,
	ERROR: 10,
	INFO: 20,
};

class Logger {
	constructor(level=10) {
		this.level = level;
	}

	call_log(level, func, ...args) {
		if(level > this.level) {
			return;
		}

		func(...args);
	}

	log(...args) {
		this.call_log(LOG_LEVELS.INFO, console.log, ...args);
	}

	error(message, ...args) {
		this.call_log(LOG_LEVELS.ERROR, console.error, message, ...args);
		this.call_log(LOG_LEVELS.ERROR, console.error, `::error ::${message}`);
	}

	notice(message, ...args) {
		this.log(message, ...args)
		this.call_log(LOG_LEVELS.INFO, console.log, `::notice ::${message}`);
	}
}

const log_level = LOG_LEVELS[process.env.INPUT_LOG_LEVEL || 'ERROR'];
const log = new Logger(log_level);

module.exports = {
	Logger,
	log
};
