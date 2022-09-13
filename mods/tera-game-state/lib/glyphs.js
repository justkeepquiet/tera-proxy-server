const EventEmitter = require('events');

class Glyphs extends EventEmitter {
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

        this.installHook('S_CREST_INFO', 2, event => {
            this.known = {};
            for (const glyph of event.crests)
                this.known[glyph.id] = glyph.enable;

            this.emit('change');
        });

        this.installHook('S_CREST_APPLY', 2, event => {
            this.known[event.id] = event.enable;
            this.emit('change');
        });
    }

    reset() {
        this.known = {};
    }

    get enabled() {
        return Object.entries(this.known).filter(([id, enable]) => enable).map(([id, enable]) => id);
    }

    isKnown(id) {
        return this.known[id] !== undefined;
    }

    isEnabled(id) {
        return this.known[id] || false;
    }
}

module.exports = Glyphs;
