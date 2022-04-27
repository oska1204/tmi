require('dotenv').config();
const emojiRegexFn = require('emoji-regex');
const tmi = require('tmi.js');
const fetch = require("node-fetch");

const channels = [
    process.env.TWITCH_DEV_MODE
        ? process.env.TWITCH_CHANNEL_DEV
        : process.env.TWITCH_CHANNEL
]

const client = new tmi.Client({
    // options: { debug: true },
    identity: {
        username: process.env.TWITCH_USERNAME,
        password: process.env.TWITCH_OAUTH
    },
    channels
});

client.connect();

const double0 = str => ('0' + str).slice(-2)

const updateData = () => {
    const startList = timeList
    let fIndex = timeList.findIndex(e => e.date.getTime() > Date.now()) - 1
    if (fIndex < 0)
        fIndex = -1
    timeList = timeList.slice(fIndex)
    if (timeList.length !== startList.length) {
        console.log('Before: ', startList.map(e => e.date))
        console.log('After: ', timeList.map(e => e.date))
    }
}

const modCommandsStr = `. Mod commands: !pyramid-cd <minutes>, !max-width <width> and !toggle-pyramid`
const commandsStr = `Commands: !now, !next, !skip, !pyramid and !commands`

let timeList = []

let timeoutList = []

let pyramidGen
let pyramidEnabled = true
let maxWidth = 5
let pyramidCooldown = minToMs(2)
const lastPyramid = {}
let lastPyramidGlobal

const nameRegex = new RegExp(`^@?${process.env.TWITCH_USERNAME},?$`)
const emojiRegex = emojiRegexFn();
const dayInMs = 24 * 60 * 60 * 1000

let hostChannel = ''

client.on('hosting', function (channel, host, i) {
    hostChannel = host
    if (timeList.length === 0)
        return
    const e = timeList[0]
    const title = e?.title || ''
    if (!title)
        return
    client.say(hostChannel, `!settitle 🧽 ${title} - Baj movies`);
})

client.on('unhost', function (channel, host, i) {
    // console.log(...arguments)
})

client.on('message', function (channel, tags, message, self) {
    if (pyramidGen) {
        if (self) {
            const fn = pyramidGen.shift()
            if (fn)
                fn()
        }
        else
            pyramidGen = null
    }
    if (self || !(
        message.startsWith('!') ||
        message.match(nameRegex)))
        return;

    const args = message.split(' ');
    const command = args.shift()
        .toLowerCase()

    const log = () => {
        // const msgDate = new Date(parseInt(tags['tmi-sent-ts'])).toJSON()
        // console.log(`${msgDate} ${tags['display-name']}: ${message}`)
    }

    const isMod = tags.mod ||
        tags?.badges?.broadcaster === '1'

    if (((command === '!cmd' ||
        command === '!command') &&
        args[0] === 'edit' && (
            args[1] === 'time' ||
            args[1] === '!time')) ||
        command === '!list') {
        if (!isMod)
            return
        log();
        timeListFn(message)
        client.say(channel, `Loaded ${timeList.length} items.`);
    }
    if (command === '!next') {
        log()
        if (timeList.length === 0)
            return
        updateData()
        const e = timeList[1]
        if (!e) {
            client.say(channel, `@${tags['display-name']}, eShrug `);
            return
        }
        const { title, date } = e
        const calcDate = date.getTime() - Date.now()
        const h = Math.floor(calcDate / 1000 / 60 / 60)
        const m = Math.floor(calcDate / 1000 / 60) % 60
        const s = Math.floor(calcDate / 1000) % 60
        const hStr = h === 0
            ? ''
            : h + 'h'
        const mStr = (h === 0 && m === 0)
            ? ''
            : double0(m) + 'm'
        const sStr = double0(s) + 's'
        client.say(channel, `@${tags['display-name']}, Next: ${title} in ${hStr}${mStr}${sStr}`);
    }
    if (command === '!now') {
        log()
        if (timeList.length === 0)
            return
        updateData()
        const e = timeList[0]
        if (!e)
            return
        const { title, date } = e
        const calcDate = Date.now() - date.getTime()
        const calcDate2 = timeList[1]
            ? timeList[1].date.getTime() - date.getTime()
            : 0
        const h = Math.floor(calcDate / 1000 / 60 / 60)
        const m = Math.floor(calcDate / 1000 / 60) % 60
        const s = Math.floor(calcDate / 1000) % 60
        const mStr = double0(m)
        const sStr = double0(s)
        const h2 = Math.floor(calcDate2 / 1000 / 60 / 60)
        const m2 = Math.floor(calcDate2 / 1000 / 60) % 60
        const s2 = Math.floor(calcDate2 / 1000) % 60
        const m2Str = double0(m2)
        const s2Str = double0(s2)
        let restStr = `/${h2}:${m2Str}:${s2Str}`
        if (calcDate2 === 0)
            restStr = ''
        client.say(channel, `@${tags['display-name']}, Now: ${title} (${h}:${mStr}:${sStr}${restStr})`);
    }
    if (command.match(nameRegex)) {
        if (args.includes('amongE')) {
            log()
            client.say(channel, `AMOGUS haHAA I'M IRONIC haHAA I'M NOT AN AMONG US NORMIE BTW haHAA`)
        }
        if (args.includes('GETALIFE')) {
            log()
            client.say(channel, `Who is ${tags['display-name']} talking to LULE`)
        }
    }
    if (command === '!pyramid') {
        log()
        if (args[0] && pyramidEnabled) {
            if (args[0].match(/^[+=!@/.]/)) {
                client.say(channel, 'mods no pyramids that start with +=!@/.')
                return
            }
            let num = parseInt(args[1])
            if (Number.isNaN(num) || num < 3) {
                num = 3
            } else if (num > maxWidth) {
                num = maxWidth
            }
            const nowDate = new Date()
            const t = nowDate.getTime() - lastPyramid[num]?.getTime() || Infinity
            const tb = nowDate.getTime() - lastPyramidGlobal?.getTime() || Infinity
            if (t > pyramidCooldown * (num - 2)) {
                if (tb < pyramidCooldown) {
                    client.say(channel, `@${tags['display-name']}, pyramid on global cooldown (${Math.floor(tb / 1000)}s/${Math.round(pyramidCooldown / 1000)}s)`)
                    return
                }
                if (Math.random() < .25) {
                    const copiumMsg = `Better luck next time Sadeg`
                    client.say(channel, `!band ${tags.username} ${copiumMsg}`)
                    return
                }
                lastPyramidGlobal = nowDate
                lastPyramid[num] = nowDate
                const text = args[0]
                const msg = text.match(emojiRegex)?.[0] || text
                pyramidGen = pyramidFn(channel, msg, num)
                pyramidGen.shift()()
            } else {
                client.say(channel, `@${tags['display-name']}, ${num} width pyramid on cooldown (${Math.floor(t / 1000)}s/${Math.round(pyramidCooldown * (num - 2) / 1000)}s)`)
            }
        }
    }
    if (command === '!skip') {
        log()
        if (timeList.length === 0)
            return
        updateData()
        const obj = timeList[0]
        let s = 's'
        if (!obj.skipArr)
            obj.skipArr = []
        if (obj.skipArr.includes(tags.username)) {
            if (obj.skipArr.length <= 1)
                s = ''
            client.say(channel, `Clueless ${tags['display-name']} already voted to skip ${obj.title} (${obj.skipArr.length} vote${s})`)
        } else {
            obj.skipArr.push(tags.username)
            if (obj.skipArr.length <= 1)
                s = ''
            client.say(channel, `Clueless surely ${tags['display-name']} voted to skip ${obj.title} (${obj.skipArr.length} vote${s})`)
        }
    }
    if (command === '!commands') {
        log()
        client.say(channel, `@${tags['display-name']}, ${commandsStr} ${modCommandsStr}`)
    }
    if (command === '!pyramid-cd') {
        if (!isMod)
            return
        const minutes = parseFloat(args[0])
        const isNaN = Number.isNaN(minutes)
        if (!isNaN) {
            pyramidCooldown = minToMs(minutes)
            client.say(channel, `@${tags['display-name']}, set !pyramid cooldown to ${minutes} minutes`)
        }
    }
    if (command === '!max-width') {
        if (!isMod)
            return
        const width = parseFloat(args[0])
        const isNaN = Number.isNaN(width)
        if (!isNaN) {
            maxWidth = width
            client.say(channel, `@${tags['display-name']}, set !max-width of pyramid to ${width}`)
        }
    }
    if (command === '!toggle-pyramid') {
        if (!isMod)
            return
        pyramidEnabled = !pyramidEnabled
        client.say(channel, `@${tags['display-name']}, ${pyramidEnabled ? 'en' : 'dis'}abled !pyramid`)
    }
});

function pyramidFn(channel, msg, width) {
    const timeout = (fn, wait = 100) => new Promise(res => {
        setTimeout(() => {
            fn()
            res()
        }, wait)
    })
    const fn = i => client.say(channel, `${msg} `.repeat(i))
    const arr = []
    const action = i => {
        const boundFn = fn.bind(this, i)
        const timeoutBoundFn = timeout.bind(this, boundFn)
        arr.push(timeoutBoundFn)
    }
    for (let i = 1; i < width; i++) {
        action(i)
    }
    for (let i = width; i > 0; i--) {
        action(i)
    }
    return arr
}

// channels.forEach(channel => {
//     setInterval(() => {
//         client.say(channel, commandsStr)
//     }, minToMs(120))
// })

function minToMs(num) {
    return num * 60 * 1000
}

function timeListFn(message) {
    const listMsg = message.slice(message.indexOf(']') + 1)
    const arr = listMsg.split(' ⏩ ')
    const utc = message.match(/UTC\+(-?\d+)]/)?.[1] || 0
    const a = arr.map(e => e.split(/(?=\(\d\d?:\d{2}\))/))
    const b = a.map(e => {
        const time = e[1]?.slice(1, -1) || '0:00'
        const title = e[0].trim()
        return { title, time }
    })
    const minuteArr = b.map((e, i, a) => {
        if (i === 0)
            return { ...e, minutes: 0 }
        const p = a[i - 1]
        const [hh, mm] = p.time.split(':').map(e => parseInt(e))
        const [h, m] = e.time.split(':').map(e => parseInt(e))
        let minutes = (h - hh) * 60 + m - mm
        if (minutes < 0)
            minutes += 24 * 60
        return { ...e, minutes }
    })
    const [hStart, mStart] = minuteArr[0].time.split(':')
        .map(e => parseInt(e))
    const d = new Date()
    const now = d.getTime()
    d.setUTCHours(hStart - utc)
    d.setUTCMinutes(mStart)
    d.setUTCSeconds(0)
    const dTime = d.getTime()
    if (dTime > now + 12 * 60 * 60 * 1000)
        d.setTime(dTime + dayInMs)
    else if (dTime < now - 21 * 60 * 60 * 1000)
        d.setTime(dTime - dayInMs)
    const c = minuteArr.map(e => {
        const { minutes } = e
        const t = d.getTime()
        const ms = minToMs(minutes)
        const date = new Date(t + ms)
        d.setTime(date)
        return { ...e, date }
    })
    timeList = c
    timeoutList.forEach(e => clearTimeout(e))
    updateData()
    timeoutList = timeList.map(e => setTimeout(() => {
        if (hostChannel)
            client.say(hostChannel, `!settitle 🧽 ${e.title} - Baj movies`);
    }, e.date.getTime() - Date.now()))
}

run()
async function run() {
    const { _id } = await fetch(`https://api.streamelements.com/kappa/v2/channels/${process.env.TWITCH_CHANNEL}`)
        .then(res => res.json())
    const data = await fetch(`https://api.streamelements.com/kappa/v2/bot/commands/${_id}/public`)
        .then(res => res.json())
    const timeObj = data.find(obj => obj.command === 'time')
    const msg = timeObj.reply
    if (msg)
        timeListFn(msg)
}
