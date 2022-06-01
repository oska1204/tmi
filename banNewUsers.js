const fetch = require("node-fetch");

function hrsToMs(num) {
    return num * 60 * 60 * 1000
}

async function banNewUsers(message, say) {
    const match = message.match(/^Thank you for following (\w+)/)
    if (!match)
        return
    const { 1: user } = match
    const res = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${user}`)
        .then(e => e.json())
    res.forEach(obj => {
        const { createdAt } = obj
        const date = new Date(createdAt)
        if (date.getTime() + hrsToMs(.25) > Date.now())
            permaBan(user)
    })
    function permaBan(user) {
        say(`/ban ${user} account recently created`)
    }
}

module.exports = { banNewUsers }
