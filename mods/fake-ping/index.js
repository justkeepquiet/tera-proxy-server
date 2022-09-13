module.exports = function FakePing(mod) {
    mod.hook('C_REQUEST_GAMESTAT_PING', 1, event => {
		mod.send('S_RESPONSE_GAMESTAT_PONG', 1)
        return false
    })
    mod.hook('S_RESPONSE_GAMESTAT_PONG', 'raw', () => {
        return false
    })
}
