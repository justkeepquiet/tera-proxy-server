
// Hotfix for https://github.com/nodejs/node/issues/30039
'use strict';
require('module').wrapper[0] += `'use strict';`;

const _log = console.log;
global.console.log = function() {
	const new_args = [`[${process.pid}]`];
	new_args.push.apply(new_args, arguments);
	_log.apply(null, new_args);
};

function main() {
    require('./loader-cli');
}

// -------------------------------------------------------------------
// Prevent CLI from immediately closing in case of an error
process.stdin.resume();
process.on('uncaughtException', (e) => {
    console.log(e);
});

// Safely load configuration
let branch = 'master';

try {
    const config = require('./config').loadConfig();
    if (config) {
        if (config.branch)
            branch = config.branch.toLowerCase();
    }
} catch (_) {
    console.warn('[update] WARNING: An error occurred while trying to read the config file! Falling back to default values.');
}

// Boot
main();