const EventEmitter = require('events');

const GameStates = {
    INVALID: 0,
    CHARACTER_LOBBY: 1,
    INGAME: 2
}

class NetworkMod extends EventEmitter {
    constructor(mod) {
        super();
        this.setMaxListeners(0);

        this.mod = mod;
        this.state = GameStates.INVALID;
        this.isInLoadingScreen = false;
        this.language = null;
        this.accountId = null;
        this.accountName = null;
        this.isTBA = false;
        this.loadedSubmodules = {};

        // Now initialize default submodules
        this.installHooks();
        this.initialize('me');
    }

    destructor() {
        this.setState(GameStates.INVALID);

        for (let submodule in this.loadedSubmodules) {
            this.loadedSubmodules[submodule].destructor();
            delete this[submodule];
        }

        this.loadedSubmodules = undefined;
        this.mod = undefined;
    }

    initialize(submodules) {
        if (typeof submodules === 'string')
            submodules = [submodules];

        for (const submodule of submodules) {
            const [name, feature] = submodule.split('.');
            if (!this.loadedSubmodules[name]) {
                try {
                    let req = require(`./lib/${name}`);
                    this.loadedSubmodules[name] = new req(this);
                    this[name] = this.loadedSubmodules[name];
                }
                catch (e) {
                    this.mod.error(`Unable to load submodule ${name}:`);
                    this.mod.error(e);
                }
            }

            if (feature && this.loadedSubmodules[name]) {
                try {
                    this.loadedSubmodules[name].initialize(feature);
                } catch (e) {
                    this.mod.error(`Unable to initialize submodule feature ${name}.${feature}:`);
                    this.mod.error(e);
                }
            }
        }
    }

    installHook(name, version, cb) {
        this.mod.hook(name, version, { order: -9999, filter: { fake: null, modified: null, silenced: null } }, cb);
    }

    installHooks() {
        this.installHook('C_LOGIN_ARBITER', 2, event => {
            this.language = event.language;
            this.accountName = event.name;
        });
        
        this.installHook('S_LOGIN_ACCOUNT_INFO', this.mod.majorPatchVersion >= 100 ? 3 : 2, event => {
            this.accountId = event.accountId;
        });

        this.installHook('S_GET_USER_LIST', 'event', () => { this.setState(GameStates.CHARACTER_LOBBY); });
        this.installHook('S_RETURN_TO_LOBBY', 'event', () => { this.setState(GameStates.CHARACTER_LOBBY); this.isTBA = false; });
        this.installHook('S_LOGIN', 'event', () => { this.setLoadingScreen(true); this.setState(GameStates.INGAME); });
        this.installHook('S_LOAD_TOPO', 'event', () => { this.setLoadingScreen(true); });
        this.installHook('S_SPAWN_ME', 'event', () => { this.setLoadingScreen(false); });
        this.installHook('S_EXIT', 'event', () => { this.setState(GameStates.INVALID); });

        if (this.mod.majorPatchVersion >= 99) {
            this.installHook('S_SELECT_USER', 'event', () => { this.isTBA = false; });
            this.installHook('S_TBA_SELECT_USER', 'event', () => { this.isTBA = true; });
        }
    }

    setState(state) {
        if (this.state !== state) {
            switch (this.state) {
                case GameStates.CHARACTER_LOBBY: this.emit('leave_character_lobby'); break;
                case GameStates.INGAME: this.emit('leave_game'); break;
            }

            this.state = state;

            switch (this.state) {
                case GameStates.CHARACTER_LOBBY: this.emit('enter_character_lobby'); break;
                case GameStates.INGAME: this.emit('enter_game'); break;
            }
        }
    }

    setLoadingScreen(isInLoadingScreen) {
        if (this.isInLoadingScreen !== isInLoadingScreen) {
            this.isInLoadingScreen = isInLoadingScreen;
            this.emit(isInLoadingScreen ? 'enter_loading_screen' : 'leave_loading_screen');
        }
    }

    get isIngame() { return this.state === GameStates.INGAME; }
    get serverId() { return this.mod.serverId; }
}

module.exports = {
    NetworkMod,
    RequireInterface: (globalMod, clientMod, networkMod, requiredBy) => networkMod,
};
