const argumentate = require('argumentate');
const generators = require('./generators');

const { options, variables } = argumentate({
	args: process.argv.slice(2),
});

const [command, type] = variables;

if(command !== 'generate') {
	console.error('Command can only be "generate"');
	return process.exit(1);
}


