class Meter {
	Counter() {
		throw new Error('Should be overriden');
	}

	Histogram() {
		throw new Error('Should be overriden');
	}

	Gauge() {
		throw new Error('Should be overriden');
	}
}

module.exports = { Meter };
