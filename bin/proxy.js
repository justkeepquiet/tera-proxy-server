const mui = require('tera-toolbox-mui').DefaultInstance;
const path = require('path');
const fs = require('fs');

function LoadProtocolMap(dataFolder, version) {
    const parseMap = require('tera-data-parser').parsers.Map;
    const filename = `protocol.${version}.map`;

    // Load base
    const data = JSON.parse(fs.readFileSync(path.join(dataFolder, 'data.json')));
    let baseMap = data.maps[version] || {};

    // Load custom
    let customMap = {};
    try {
        customMap = parseMap(path.join(dataFolder, 'opcodes', filename));
    } catch (e) {
        if (e.code !== 'ENOENT')
            throw e;
    }

    return Object.assign(customMap, baseMap);
}

class TeraProxy {
    constructor(modFolder, dataFolder, config) {
        this.modFolder = modFolder;
        this.dataFolder = dataFolder;
        this.config = config;
        this.running = false;

        const ModManager = require('./mod-manager');
        this.modManager = new ModManager(this.modFolder);
        this.modManager.loadAll();

        const ConnectionManager = require('./connection-manager');
        this.connectionManager = new ConnectionManager(this.modManager);
    }

    destructor() {
        if (this.modManager) {
            this.modManager.destructor();
            this.modManager = null;
        }

        if (this.connectionManager) {
            this.connectionManager.destructor();
            this.connectionManager = null;
        }

        this.running = false;
    }

    get hasActiveConnections() {
        return this.connectionManager.hasActiveConnections;
    }

    run() {
        // Use config for metadata
        const metadata = {
            dataFolder: this.dataFolder,
            publisher: this.config.publisher,
            language: this.config.language,
            platform: 'pc',
            environment: 'live',
            majorPatchVersion: Number(this.config.patchVersion.split(".")[0]),
            minorPatchVersion: Number(this.config.patchVersion.split(".")[1]),
            protocolVersion: this.config.protocolVersion,
            maps: { protocol: {}, sysmsg: {} }
        };

        // Load protocol map
        metadata.maps.protocol = {};
        try {
            metadata.maps.protocol = Object.assign(LoadProtocolMap(this.dataFolder, metadata.protocolVersion), metadata.protocol);

            if (Object.keys(metadata.maps.protocol).length === 0) {
                console.warn(mui.get('proxy/warning-unmapped-protocol-1', { protocolVersion: metadata.protocolVersion, publisher: metadata.publisher, majorPatchVersion: metadata.majorPatchVersion, minorPatchVersion: metadata.minorPatchVersion }));
                console.warn(mui.get('proxy/warning-unmapped-protocol-2'));
                console.warn(mui.get('proxy/warning-unmapped-protocol-3'));
                console.warn(mui.get('proxy/warning-unmapped-protocol-4'));
                console.warn(mui.get('proxy/warning-unmapped-protocol-5'));
                console.warn(mui.get('proxy/warning-unmapped-protocol-6'));
                console.warn(mui.get('proxy/warning-unmapped-protocol-7'));
                console.warn(mui.get('proxy/warning-unmapped-protocol-8', { supportUrl: global.TeraProxy.SupportUrl }));
            } else {
                console.log(mui.get('proxy/protocol-loaded', { protocolVersion: metadata.protocolVersion, publisher: metadata.publisher, majorPatchVersion: metadata.majorPatchVersion, minorPatchVersion: metadata.minorPatchVersion }));
            }
        } catch (e) {
            console.error(mui.get('proxy/error-cannot-load-protocol', { protocolVersion: metadata.protocolVersion, publisher: metadata.publisher, majorPatchVersion: metadata.majorPatchVersion, minorPatchVersion: metadata.minorPatchVersion }));
            console.error(e);
        }

        // Create a new server
        const net = require('net');
        const server = net.createServer(socket => this.connectionManager.start({ ip: this.config.serverIp, port: this.config.serverPort }, socket, metadata));

        server.listen(this.config.listenPort, this.config.listenIp);
    }
}

module.exports = TeraProxy;
