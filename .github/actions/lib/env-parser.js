class EnvParser {
	static parse_bool(value) {
		if(typeof value === 'boolean') {
			return value;
		}

		if(value === undefined || value === null) {
			return false;
		}

		if(typeof value === 'string') {
			if(value.toLowerCase() === 'false') {
				return false;
			}

			if(value.toLowerCase() === 'true') {
				return true;
			}

			throw new Error(`Expected booleanish but got "${value}"`);
		}

		return Boolean(value);
	}
}

module.exports = {
	EnvParser
};
