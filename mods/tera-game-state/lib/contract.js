const EventEmitter = require('events');

class Contract extends EventEmitter {
    constructor(parent) {
        super();
        this.setMaxListeners(0);

        this.parent = parent;
        this.parent.initialize('me');

        // TODO: check if we're not ingame. if we are, fail!

        this.reset();
        this.installHooks();
    }

    destructor() {
        this.reset();
        this.parent = undefined;
    }

    installHook(name, version, cb) {
        return this.parent.mod.hook(name, version, { order: -10000, filter: { fake: null, modified: null, silenced: null } }, cb);
    }

    installHooks() {
        this.parent.on('enter_game', () => { this.reset(); });
        this.parent.on('leave_game', () => { this.reset(); });
        this.parent.on('enter_loading_screen', () => { this.reset(); });
        this.parent.me.on('die', () => { this.reset(); });
        this.parent.me.on('resurrect', () => { this.reset(); });

        this.installHook('S_REQUEST_CONTRACT', this.parent.mod.majorPatchVersion >= 108 ? 2 : 1, (event) => {
            this.id = event.id;
            this.type = event.type;

            this.emit('begin', this.type, this.id);
        });

        this.installHook('S_ACCEPT_CONTRACT', 'event', (event) => {
            this.reset();
            this.emit('end', 'accept');
        });

        this.installHook('S_REJECT_CONTRACT', 'event', (event) => {
            this.reset();
            this.emit('end', 'reject');
        });

        this.installHook('S_CANCEL_CONTRACT', 'event', (event) => {
            this.reset();
            this.emit('end', 'cancel');
        });
    }

    get active() { return !!this.id; }

    reset() {
        this.id = null;
        this.type = null;
    }
}

module.exports = Contract;
