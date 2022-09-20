
// Hotfix for https://github.com/nodejs/node/issues/30039
'use strict';
require('module').wrapper[0] += `'use strict';`;

const _log = console.log;

global.console.log = function() {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now.getMilliseconds().toString().padStart(3, "0")}`;
    const newArgs = [`[${process.pid}]`, `[${timeStr}]`];

    newArgs.push.apply(newArgs, arguments);
    _log.apply(null, newArgs);
};

global.console.error = global.console.log;
global.console.warn = global.console.log;

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