module.exports = (ajv) => {
	ajv.addFormat('isodate', /\d{4}-[0-1][0-9]-[0-3][0-9]T(0\d|1\d|2[0-3]):[0-5][0-9]:[0-5][0-9].\d{3}Z/);
	ajv.addFormat('email', /^[a-zA-Z0-9\.\-_]{1,}@[a-zA-Z0-9\.\-_]{1,}\.[a-zA-Z0-9]{2,}$/)
	return ajv;
};
