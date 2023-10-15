const mui = require('tera-toolbox-mui').DefaultInstance;
const path = require('path');
const fs = require('fs');
const net = require('net');
const { protocol } = require('tera-data-parser');
const { hasPadding } = require('tera-network-proxy');

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
        this.metadata = [];

        const ModManager = require('./mod-manager');
        this.modManager = new ModManager(this.modFolder);
        this.modManager.loadAll();

        const ConnectionManager = require('./connection-manager');
        this.connectionManager = new ConnectionManager(this.modManager);

        this.config.servers.forEach(data => {
            // Use config for metadata
            const metadata = {
                dataFolder: this.dataFolder,
                serverList: this.config.servers,
                serverId: data.serverId,
                publisher: data.publisher,
                language: data.language,
                platform: 'pc',
                environment: 'live',
                majorPatchVersion: Number(data.patchVersion.split(".")[0]),
                minorPatchVersion: Number(data.patchVersion.split(".")[1]),
                protocolVersion: data.protocolVersion,
                maps: { protocol: {}, sysmsg: {} },
                //
                sysmsgMap: { name: new Map(), code: new Map() },
                protocolMap: { name: new Map(), code: new Map(), padding: (new Array(0x10000)).fill(false) },
                protocol: {},
                latestDefVersion: new Map()
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
                    // Initialize sysmsg maps
                    Object.keys(metadata.maps.sysmsg).forEach(name => {
                        metadata.sysmsgMap.name.set(name, metadata.maps.sysmsg[name]);
                        metadata.sysmsgMap.code.set(metadata.maps.sysmsg[name], name);
                    });

                    // Initialize protocol maps
                    Object.keys(metadata.maps.protocol).forEach(name => {
                        metadata.protocolMap.name.set(name, metadata.maps.protocol[name]);
                        metadata.protocolMap.code.set(metadata.maps.protocol[name], name);
                        metadata.protocolMap.padding[metadata.maps.protocol[name]] = hasPadding(metadata.protocolVersion, name);
                    });

                    // Initialize protocol
                    metadata.protocol = new protocol(metadata.majorPatchVersion, metadata.minorPatchVersion, metadata.protocolMap, metadata.platform);
                    metadata.protocol.load(metadata.dataFolder);

                    if (metadata.protocol.messages) {
                        for (const [name, defs] of metadata.protocol.messages) {
                            metadata.latestDefVersion.set(name, Math.max(...defs.keys()));
                        }
                    }

                    console.log(mui.get('proxy/protocol-loaded', { protocolVersion: metadata.protocolVersion, publisher: metadata.publisher, majorPatchVersion: metadata.majorPatchVersion, minorPatchVersion: metadata.minorPatchVersion }));
                }
            } catch (e) {
                console.error(mui.get('proxy/error-cannot-load-protocol', { protocolVersion: metadata.protocolVersion, publisher: metadata.publisher, majorPatchVersion: metadata.majorPatchVersion, minorPatchVersion: metadata.minorPatchVersion }));
                console.error(e);
            }

            this.metadata.push(metadata);
        });
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
        this.config.servers.forEach((data, index) => {
            const metadata = this.metadata[index];

            // Create a new server
            const server = net.createServer(socket => this.connectionManager.start({ ip: data.serverIp, port: data.serverPort }, socket, metadata, !data.integrity));

            server.listen(data.listenPort, data.listenIp, () => {
                const { address: listen_ip, port: listen_port } = server.address();
                console.log(mui.get('proxy/redirecting-server', { name: data.name, publisher: metadata.publisher, serverId: metadata.serverId, listen_ip, listen_port, ip: data.serverIp, port: data.serverPort }));
            });
        });
    }
}

module.exports = TeraProxy;
