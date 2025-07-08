class CSVFormatter {
	constructor({ separator=',' }={}) {
		this.separator = separator;
	}

	format_value(value) {
		const escaped_value = value.replace(this.separator, `\\${this.separator}`).replace('"', '\\"');
		if(value.includes(this.separator) || value.includes('"')) {
			return `"${escaped_value}"`;
		}

		return escaped_value;
	}

	format(array_objects=[], headers) {
		if(!headers) {
			if(!array_objects[0]) {
				// there's nothing we can do
				return '';
			}

			headers = Object.keys(array_objects[0]);
		}

		headers = headers.join(',') + "\n";

		return array_objects.reduce((csv, row) => {
			csv += Object.values(row).map(val => this.format_value(val)).join(',');
			return csv;
		}, headers)
	}
}

module.exports = { CSVFormatter };
