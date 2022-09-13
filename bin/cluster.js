const path = require("path");
const cluster = require("cluster");

const config = {
	numWorkers: require("os").cpus().length
};

cluster.setupMaster({
	exec: path.join(__dirname, "index-cli.js")
});

// Fork workers as needed.
for (let i = 0; i < config.numWorkers; i++) {
	cluster.fork();
}