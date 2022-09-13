# tera-game-state
[TERA Toolbox](https://github.com/tera-toolbox/tera-toolbox) core module that implements a game state tracking library for network mods.

# Documentation
- Submodule `me`: [here](doc/me.md)
- Submodule `contract`: [here](doc/contract.md)
- Submodule `inventory`: [here](doc/inventory.md)
- Submodule `talents`: [here](doc/talents.md)
- Submodule `glyphs`: [here](doc/glyphs.md)
- Submodule `party`: [here](doc/party.md)

# Requesting submodules
To reduce overhead, most submodules need to be explicitly requested by a module using them (during initialization, recommended in the module's constructor):
```js
module.exports = function GameStateExample(mod) {
    // This:
    mod.game.initialize(["me", "contract"]);
    // Is identical to this:
    mod.game.initialize("me");
    mod.game.initialize("contract");

    // Note that some submodules have even finer grained features that need to be activated individually (in order to reduce overhead when unused).
    // Activating a feature (here: "abnormalities" feature of "me" submodule) will implicitly also activate the corresponding submodule (here: "me").
    mod.game.initialize("me.abnormalities");

    // Submodules "me" and "contract" can now be used.
    // Note that "me" does not need to be explicitly requested; it is always loaded by default!
    mod.game.contract.on("begin", (type, id) => {
        // Do stuff!
    });
}
```

# Usage example
```js
module.exports = function GameStateExample(mod) {
    // An instance of tera-game-state (as well as command) is readily available through mod.game!
    // We're using the "inventory" submodule later on, which needs to be explicitly enabled in order to avoid overhead if unused (see above)
    mod.game.initialize('inventory');

    // You can register event handlers (higher-level abstraction than just listening to packets)
    mod.game.on('enter_game', () => {
        mod.log(`You are now ingame on a ${mod.game.me.race} ${mod.game.me.gender} ${mod.game.me.class}!`);

        // Special action required for human male brawler (names are taken directly from DC to avoid confusion)
        if(mod.game.me.race === 'human' && mod.game.me.gender === 'male' && mod.game.me.class === 'fighter')
        {
            // Do stuff!
        }
    });

    mod.game.on('leave_game', () => {
        // Clean up!
    });

    mod.game.on('enter_loading_screen', () => {
        // ...
    });

    // Or you can just access its data at any time:
    mod.hook('S_ABNORMALITY_BEGIN', 2, (event) => {
        if(mod.game.me.is(event.target))
        {
            mod.log('An abnormality was applied to our player!');
            if(mod.game.inventory.weaponEquipped && mod.game.inventory.getTotalAmountInBag(6550) >= 10)
                mod.log(`... and we have a weapon equipped, at least 10x Minor Recovery Potables in the bag, and ${mod.game.inventory.money / 10000n} gold!`);
        }
    });
}
```
