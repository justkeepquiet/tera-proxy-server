const EventEmitter = require('events');

class Party extends EventEmitter {
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

		this.installHook('S_PARTY_MEMBER_LIST', this.parent.mod.majorPatchVersion >= 106 ? 9 : 7, event => {
			this.partyMembers = [];
			event.members.forEach(member => {
				if (!(this.parent.me.is(event.gameId)))
					this.partyMembers.push({ "gameId": member.gameId, "playerId": member.playerId, "serverId": member.serverId, "name": member.name, "class": member.class });
			});

			this.emit('list', this.partyMembers);
		});

		this.installHook('S_LEAVE_PARTY_MEMBER', 2, event => {
			this._generateSimpleEvent(event, "member_leave")
			this.emit('list', this.partyMembers);

		});

		this.installHook('S_BAN_PARTY_MEMBER', 1, event => {
			this._generateSimpleEvent(event, "member_kick")
			this.emit('list', this.partyMembers);
		});

		this.installHook('S_LEAVE_PARTY', "event", () => {
			this.reset();
			this.emit('leave');
		});

		//Bugfix for p97+ issues by BHS
		this.installHook('S_SPAWN_USER', this.parent.mod.majorPatchVersion >= 101 ? 17 : 15 , event => {
			let wasBugFixed = false;
			for (let i = 0; i < this.partyMembers.length; i++) {
				if(this.partyMembers[i].serverId === event.serverId && this.partyMembers[i].playerId === event.playerId && this.partyMembers[i].gameId !== event.gameId) {
					this.partyMembers[i].gameId = event.gameId;
					wasBugFixed = true;
				}
			}

			if(wasBugFixed) this.emit('list', this.partyMembers);
		});
	}

	reset() {
		this.partyMembers = [];
	}

	isMember(gameId) {
		for (let i = 0; i < this.partyMembers.length; i++) {
			if (this.partyMembers[i].gameId === gameId) return true;
		}
		return false;
	}

	getMemberData(gameId) {
		for (let i = 0; i < this.partyMembers.length; i++) {
			if (this.partyMembers[i].gameId === gameId) return this.partyMembers[i];
		}
		return null;
	}

	inParty() {
		return this.partyMembers.length > 0;
	}

	_generateSimpleEvent(event, eventType) {
		let retObj = { class: -1};

		//getting class from current party list
		for (let i = 0; i < this.partyMembers.length; i++) {
			if(this.partyMembers[i].serverId === event.serverId && this.partyMembers[i].playerId === event.playerId) {
				retObj.class = this.partyMembers[i].class;
			}
		}
		
		retObj.playerId = event.playerId;
		retObj.serverId = event.serverId;
		retObj.name = event.name;

		this.partyMembers = this.partyMembers.filter(elem => elem.playerId !== event.playerId || elem.serverId !== event.serverId);

		this.emit(eventType, retObj);
	}
}

module.exports = Party;
