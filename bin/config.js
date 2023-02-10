const path = require('path');
const fs = require('fs');
const ConfigFilePath = path.join(__dirname, '..', 'config.json');

function loadConfig() {
    let result = null;
    try {
        result = fs.readFileSync(ConfigFilePath, 'utf8');
    } catch (_) {
        return {
            servers: [
                {
                    listenIp: "0.0.0.0",
                    listenPort: 7801,
                    serverIp: "127.0.0.1",
                    serverPort: 7701,
                    name: "Tera Private",
                    serverId: 2800,
                    publisher: "GF",
                    language: "eu",
                    patchVersion: "100.02",
                    protocolVersion: 376012,
                    integrity: false
                }
            ]
        };
    }

    return JSON.parse(result);
}

function saveConfig(newConfig) {
    fs.writeFileSync(ConfigFilePath, JSON.stringify(newConfig, null, 4));
}

module.exports = { loadConfig, saveConfig };
