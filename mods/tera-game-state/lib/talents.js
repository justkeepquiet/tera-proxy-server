const EventEmitter = require('events');

class Talents extends EventEmitter {
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

        this.installHook('S_LOAD_EP_INFO', this.parent.mod.majorPatchVersion >= 105 ? 3 : 1, event => {
            this.perks = {};
            for (const perk of event.perks)
                this.perks[perk.id] = perk.level;
            this.emit('change_perks', 'init');
        });

        this.installHook('S_LEARN_EP_PERK', 1, event => {
            if (!event.success)
                return;

            this.perks = {};
            for (const perk of event.perks)
                this.perks[perk.id] = perk.level;
            this.emit('change_perks', 'learn');
        });

        if (this.parent.mod.majorPatchVersion >= 96) {
            this.installHook('TTB_S_LOAD_EP_PAGE', 1, event => {
                this.perks = {};
                for (const perk of event.perks)
                    this.perks[perk.id] = perk.level;
                this.emit('change_perks', 'change_preset');
            });
        }

        this.installHook('S_RESET_EP_PERK', 1, event => {
            if (!event.success)
                return;

            this.perks = {};
            this.emit('change_perks', 'reset');
        });
    }

    reset() {
        this.perks = {};
    }

    getPerkLevel(id) {
        return this.perks[id] || 0;
    }

    hasPerk(id) {
        return this.perks[id] !== undefined;
    }
}

module.exports = Talents;
