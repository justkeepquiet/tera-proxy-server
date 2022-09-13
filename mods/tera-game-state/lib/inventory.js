const EventEmitter = require('events');

class Inventory extends EventEmitter {
    constructor(parent) {
        super();
        this.setMaxListeners(0);

        this.parent = parent;
        this.parent.initialize('me');

        // TODO: check if we're not ingame. if we are, fail!

        this.reset();
        this.installHooks();

        this.pocketItems = new Proxy(Object.create(null), {
            get: (obj, key) => {
                return key in pockets ? Object.values(this.pockets[key].slots) : [];
            },
            set() {
                throw new TypeError('Cannot set property of pocketItems');
            }
        });
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

        this.installHook('S_INVEN_USERDATA', 2, event => {
            if (!this.parent.me.is(event.gameId))
                return;

            this.equipmentItemLevel = event.itemLevel;
            this.totalItemLevel = event.itemLevelInventory;
            this.tcat = event.tcat;
        });

        this.installHook('S_ITEMLIST', this.parent.mod.majorPatchVersion >= 96 ? 4 : 3, event => {
            if (!this.parent.me.is(event.gameId))
                return;

            if (event.first)
                this._buffer = event;
            else
                this._buffer.items = this._buffer.items.concat(event.items);

            if (!event.more) {
                // Load money etc.
                switch (this._buffer.container) {
                    // Inventory / Pockets
                    case 0: {
                        if (this.pockets[this._buffer.pocket])
                            Object.values(this.pockets[this._buffer.pocket].slots).forEach(item => { delete this.dbids[item.dbid]; });

                        this.money = this._buffer.money;
                        this.pocketCount = this._buffer.numPockets;
                        this.pockets[this._buffer.pocket] = {
                            size: this._buffer.size,
                            lootPriority: this._buffer.lootPriority,
                            slots: {}
                        };

                        this._buffer.items.forEach(item => {
                            item.container = this._buffer.container;
                            item.pocket = this._buffer.pocket;
                            item.data = this.parent.data.items.get(item.id);
                            this.pockets[this._buffer.pocket].slots[item.slot] = item;
                            this.dbids[item.dbid] = item;
                        });

                        break;
                    }

                    // Equipment
                    case 14: {
                        if (this.equipment)
                            Object.values(this.equipment.slots).forEach(item => { delete this.dbids[item.dbid]; });

                        this.equipment = {
                            size: this._buffer.size,
                            slots: {}
                        };

                        this._buffer.items.forEach(item => {
                            item.container = this._buffer.container;
                            item.pocket = this._buffer.pocket;
                            item.data = this.parent.data.items.get(item.id);
                            this.equipment.slots[item.slot] = item;
                            this.dbids[item.dbid] = item;
                        });

                        break;
                    }
                }

                this._buffer = null;
                if (event.lastInBatch)
                    this.emit('update');
            }
        });
    }

    reset() {
        this._buffer = null;
        this.dbids = {};
        this.equipmentItemLevel = null;
        this.totalItemLevel = null;
        this.money = null;
        this.tcat = null;
        this.pocketCount = 0;
        this.pockets = [];
        this.equipment = {
            size: 0,
            slots: {}
        };
    }

    get bag() {
        return this.pockets[0];
    }

    get items() {
        return Object.values(this.dbids);
    }

    get equipmentItems() {
        return Object.values(this.equipment.slots);
    }

    get bagItems() {
        return Object.values(this.bag.slots);
    }

    get bagOrPocketItems() {
        return this.items.filter(item => this.isInBagOrPockets(item));
    }

    isInEquipment(item) {
        return item.container === 14;
    }

    isInBag(item) {
        return item.container === 0 && item.pocket === 0;
    }

    isInPocket(item, pocket) {
        return item.container === 0 && item.pocket === pocket;
    }

    isInPockets(item) {
        return item.container === 0 && item.pocket > 0;
    }

    isInBagOrPockets(item) {
        return item.container === 0;
    }

    getTotalAmount(id) {
        if (Array.isArray(id))
            return this.items.reduce((amount, item) => id.includes(item.id) ? amount + item.amount : amount, 0);
        else
            return this.items.reduce((amount, item) => (item.id === id) ? amount + item.amount : amount, 0);
    }

    getTotalAmountInEquipment(id) {
        if (Array.isArray(id))
            return this.equipmentItems.reduce((amount, item) => id.includes(item.id) ? amount + item.amount : amount, 0);
        else
            return this.equipmentItems.reduce((amount, item) => (item.id === id) ? amount + item.amount : amount, 0);
    }

    getTotalAmountInBag(id) {
        if (Array.isArray(id))
            return this.bagItems.reduce((amount, item) => id.includes(item.id) ? amount + item.amount : amount, 0);
        else
            return this.bagItems.reduce((amount, item) => (item.id === id) ? amount + item.amount : amount, 0);
    }

    getTotalAmountInPocket(pocket, id) {
        if (pocket >= this.pocketCount)
            return 0;

        const pocketItems = Object.values(this.pockets[pocket].slots);
        if (Array.isArray(id))
            return pocketItems.reduce((amount, item) => id.includes(item.id) ? amount + item.amount : amount, 0);
        else
            return pocketItems.reduce((amount, item) => (item.id === id) ? amount + item.amount : amount, 0);
    }

    getTotalAmountInPockets(id) {
        let res = 0;
        for (let pocket = 1; pocket < this.pocketCount; ++pocket)
            res += this.getTotalAmountInPocket(pocket, id);
        return res;
    }

    getTotalAmountInBagOrPockets(id) {
        return this.getTotalAmountInBag(id) + this.getTotalAmountInPockets(id);
    }

    find(id) {
        if (Array.isArray(id))
            return this.items.find(item => id.includes(item.id));
        else
            return this.items.find(item => item.id === id);
    }

    findInEquipment(id) {
        if (Array.isArray(id))
            return this.equipmentItems.find(item => id.includes(item.id));
        else
            return this.equipmentItems.find(item => item.id === id);
    }

    findInBag(id) {
        if (Array.isArray(id))
            return this.bagItems.find(item => id.includes(item.id));
        else
            return this.bagItems.find(item => item.id === id);
    }

    findInPocket(pocket, id) {
        if (pocket >= this.pocketCount)
            return;

        const pocketItems = Object.values(this.pockets[pocket].slots);
        if (Array.isArray(id))
            return pocketItems.find(item => id.includes(item.id));
        else
            return pocketItems.find(item => item.id === id);
    }

    findInPockets(id) {
        for (let pocket = 1; pocket < this.pocketCount; ++pocket) {
            const res = this.findInPocket(pocket, id);
            if (res)
                return res;
        }
    }

    findInBagOrPockets(id) {
        return this.findInBag(id) || this.findInPockets(id);
    }

    findAll(id) {
        if (Array.isArray(id))
            return this.items.filter(item => id.includes(item.id));
        else
            return this.items.filter(item => item.id === id);
    }

    findAllInEquipment(id) {
        if (Array.isArray(id))
            return this.equipmentItems.filter(item => id.includes(item.id));
        else
            return this.equipmentItems.filter(item => item.id === id);
    }

    findAllInBag(id) {
        if (Array.isArray(id))
            return this.bagItems.filter(item => id.includes(item.id));
        else
            return this.bagItems.filter(item => item.id === id);
    }

    findAllInPocket(pocket, id) {
        if (pocket >= this.pocketCount)
            return [];

        const pocketItems = Object.values(this.pockets[pocket].slots);
        if (Array.isArray(id))
            return pocketItems.filter(item => id.includes(item.id));
        else
            return pocketItems.filter(item => item.id === id);
    }

    findAllInPockets(id) {
        let res = [];
        for (let pocket = 1; pocket < this.pocketCount; ++pocket)
            res = res.concat(this.findAllInPocket(pocket, id));
        return res;
    }

    findAllInBagOrPockets(id) {
        return [...this.findAllInBag(id), ...this.findAllInPockets(id)];
    }

    get equipmentPassivities() {
        let res = [];
        this.equipmentItems.forEach(item => {
            const activePassivities = item.passivitySets[item.passivitySet];
            if (activePassivities)
                res = res.concat(activePassivities.passivities.filter(passivity => passivity !== 0));
            res = res.concat(item.mergedPassivities);
        });

        return res;
    }

    get equipmentCrystals() {
        let res = [];
        this.equipmentItems.forEach(item => {
            res = res.concat(item.crystals.filter(crystal => crystal !== 0));
        });

        return res;
    }

    get weaponEquipped() {
        return !!this.equipment.slots[1];
    }
}

module.exports = Inventory;
