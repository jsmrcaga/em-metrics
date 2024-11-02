class BadAuthError extends Error {
	constructor(type) {
		super(`Wrong authentication for type "${type}"`);
		this.type = type;
	}
}

class Auth {
	static TYPE = 'basic';

	test(value) {
		const { TYPE } = this.constructor;
		const reg = new RegExp(`^${TYPE}\\s`, 'gi');

		if(!reg.test(value)) {
			return false;
		}

		return this.check(value.replace(reg, '').trim());
	}

	check(value) {
		throw new Error('Should be overriden');
	}
}

class TokenAuth extends Auth {
	static TYPE = 'token';

	constructor(token) {
		super();
		this.token = token;
	}

	check(value) {
		if(value !== this.token) {
			throw new BadAuthError('token');
		}

		return true;
	}
}

class BasicAuth extends Auth {
	static TYPE = 'basic';

	constructor({ username='', password='' }) {
		super();
		this.username = username;
		this.password = password;

		this.token = Buffer.from(`${username}:${password}`).toString('base64');
	}

	usable() {
		return Boolean(this.username || this.password);
	}

	check(value) {
		if(!this.usable()) {
			return false;
		}

		if(value !== this.token) {
			throw new BadAuthError('basic');
		}

		return true;
	}
}

module.exports = {
	BadAuthError,
	TokenAuth,
	BasicAuth
};
