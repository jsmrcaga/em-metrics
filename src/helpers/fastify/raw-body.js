const { PassThrough } = require('node:stream');

module.exports = function raw_body_parser(request, reply, payload) {
	return new Promise((resolve, reject) => {
		if(!('raw_body' in request)) {
			return reject(new Error('Please decorate request with raw_body'));
		}

		const body_stream = payload;
		// we do this to allow fastify to parse JSON as usual
		const fastify_passthrough = new PassThrough();
		const raw_passthrough = new PassThrough();

		let raw_data = Buffer.from([]);
		let stream_done = false;

		const on_error = (err) => {
			reject(err);
		};

		const on_close = () => {
			if(stream_done) {
				return;
			}

			reject(new Error('Stream closed before finishing parsing'));
		};

		const on_data = (chunk) => {
			raw_data = Buffer.concat([raw_data, chunk]);
		};

		const on_end = () => {
			stream_done = true;
			request.raw_body = raw_data;
			// Return initial payload to be treated as json
			resolve(fastify_passthrough);
			// decouple event listeners
			raw_passthrough.removeListener('close', on_close);
			raw_passthrough.removeListener('data', on_data);
			raw_passthrough.removeListener('error', on_error);
			raw_passthrough.removeListener('end', on_end);
		};

		body_stream.pipe(fastify_passthrough);
		body_stream.pipe(raw_passthrough);

		raw_passthrough.on('close', on_close);
		raw_passthrough.on('data', on_data);
		raw_passthrough.on('error', on_error);
		raw_passthrough.on('end', on_end);
	});
}
