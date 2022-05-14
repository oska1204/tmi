require('dotenv').config();
const emojiRegexFn = require('emoji-regex');
const tmi = require('tmi.js');
const fetch = require("node-fetch");
const { mongoMsg } = require('./mongo-msg')
const { mongoList } = require('./mongo-list')

const {
    TWITCH_USERNAME,
    TWITCH_OAUTH,
    TWITCH_CHANNEL,
    TWITCH_CHANNEL_DEV,
    TWITCH_DEV_MODE,
} = process.env

const channels = [
    TWITCH_DEV_MODE
        ? TWITCH_CHANNEL_DEV
        : TWITCH_CHANNEL
]

const client = new tmi.Client({
    // options: { debug: true },
    identity: {
        username: TWITCH_USERNAME,
        password: TWITCH_OAUTH
    },
    channels
});

client.connect();

const double0 = str => ('0' + str).slice(-2)

const updateData = () => {
    const startList = timeList
    let fIndex = timeList.findIndex(e => e.date.getTime() > Date.now()) - 1
    if (fIndex === -1)
        fIndex = 0
    if (fIndex < -1)
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

let pyramidEnabled = true
let maxWidth = 5
let pyramidCooldown = minToMs(10)
const lastPyramid = {}
let lastPyramidGlobal

const nameRegex = new RegExp(`^@?${TWITCH_USERNAME},?$|^@?${TWITCH_USERNAME},? `, 'i')
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
    if (self)
        return
    mongoMsg(channel, tags, message)
    if (!(
        message.startsWith('!') ||
        message.startsWith('=') ||
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

    if (command === '=eg') {
        client.say(channel, `@${tags['display-name']} | @OkayegBOT is gone Sadeg | -9999 egs | Total egs: ${Math.floor(Math.random() * -99999)} 🥚`);
        return
    }
    if (command === '!cmd' ||
        command === '!command') {
        const [lc0, lc1] = args.map(e => e.toLowerCase())
        if (lc0 === 'edit' &&
            lc1.match(/^!?time$/)) {
            if (!isMod)
                return
            log();
            timeListFn(args.slice(2).join(' '))
            client.say(channel, `Loaded ${timeList.length} items.`);
        }
        if (lc0 === 'edit' &&
            lc1.match(/^!?dlc$/)) {
            if (!isMod)
                return
            log();
            const say = msg => client.say(channel, msg)
            mongoList(args.slice(2).join(' '), say)
        }
        return
    }
    if (command === '!list') {
        if (!isMod)
            return
        log();
        timeListFn(args.join(' '))
        client.say(channel, `Loaded ${timeList.length} items.`);
        return
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
        const timeStr = timeStrFn(calcDate)
        client.say(channel, `@${tags['display-name']}, Next: ${title} in ${timeStr}`);
        return
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
        const startStr = nowTimeStrFn(calcDate)
        const restStr = calcDate2 === 0
            ? ''
            : '/' + nowTimeStrFn(calcDate2)
        client.say(channel, `@${tags['display-name']}, Now: ${title} (${startStr}${restStr})`);
        return
    }
    if (command.match(nameRegex)) {
        if (args.includes('amongE')) {
            log()
            client.say(channel, `haHAA AMOGUS haHAA IM JUST IRONIC BTW haHAA IM NOT ACTUALLY AMONG US NORMIE`)
        } else if (args.includes('xqcL')) {
            log()
            client.say(channel, `@${tags['display-name']} xqcL`)
        } else {
            log()
            client.say(channel, `Who is ${tags['display-name']} talking to LULE`)
        }
        return
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
                    const remainCooldownStr = timeStrFn(pyramidCooldown - tb)
                    client.say(channel, `@${tags['display-name']}, pyramid on global cooldown (${remainCooldownStr})`)
                    return
                }
                if (Math.random() < .25) {
                    const copiumMsg = `Better luck next time Sadeg`
                    client.say(channel, `!band ${tags['display-name']} ${copiumMsg}`)
                    return
                }
                lastPyramidGlobal = nowDate
                lastPyramid[num] = nowDate
                const text = args[0]
                const msg = text.match(emojiRegex)?.[0] || text
                pyramidFn(channel, msg, num)
            } else {
                const remainCooldownStr = timeStrFn(pyramidCooldown * (num - 2) - t)
                client.say(channel, `@${tags['display-name']}, ${num} width pyramid on cooldown (${remainCooldownStr})`)
            }
        }
        return
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
        if (obj.skipArr.includes(tags['display-name'])) {
            if (obj.skipArr.length <= 1)
                s = ''
            client.say(channel, `Clueless ${tags['display-name']} already voted to skip ${obj.title} (${obj.skipArr.length} vote${s})`)
        } else {
            obj.skipArr.push(tags['display-name'])
            if (obj.skipArr.length <= 1)
                s = ''
            client.say(channel, `Clueless surely ${tags['display-name']} voted to skip ${obj.title} (${obj.skipArr.length} vote${s})`)
        }
        return
    }
    if (command === '!retards') {
        log()
        const obj = timeList[0]
        if (obj.skipArr)
            client.say(channel, `@${tags['display-name']}, ${obj.skipArr.map(e => `#${e}`).join(' ')} ForsenLookingAtYou`)
        else
            client.say(channel, `@${tags['display-name']}, ForsenLookingAtYou`)
    }
    if (command === '!commands') {
        log()
        client.say(channel, `@${tags['display-name']}, ${commandsStr}${modCommandsStr}`)
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
        return
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
        return
    }
    if (command === '!toggle-pyramid') {
        if (!isMod)
            return
        pyramidEnabled = !pyramidEnabled
        client.say(channel, `@${tags['display-name']}, ${pyramidEnabled ? 'en' : 'dis'}abled !pyramid`)
        return
    }
});

function pyramidFn(channel, msg, width) {
    const fn = i => client.say(channel, `${msg} `.repeat(i))
    for (let i = 1; i < width; i++) {
        fn(i)
    }
    for (let i = width; i > 0; i--) {
        fn(i)
    }
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
    let val = hStart - utc
    if (val < 0)
        val += 24
    d.setUTCHours(val)
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
    const { _id } = await fetch(`https://api.streamelements.com/kappa/v2/channels/${TWITCH_CHANNEL}`)
        .then(res => res.json())
    const data = await fetch(`https://api.streamelements.com/kappa/v2/bot/commands/${_id}/public`)
        .then(res => res.json())
    const timeObj = data.find(obj => obj.command === 'time')
    const msg = timeObj.reply
    if (msg)
        timeListFn(msg)
}

function timeStrFn(time) {
    time = parseFloat(time)
    const h = Math.floor(time / 1000 / 60 / 60)
    const m = Math.floor(time / 1000 / 60) % 60
    const s = Math.floor(time / 1000) % 60
    const hStr = h === 0
        ? ''
        : h + 'h'
    let mStr
    if (h === 0) {
        if (m === 0)
            mStr = ''
        else
            mStr = m + 'm'
    } else
        mStr = double0(m) + 'm'
    const sStr = (h === 0 && m === 0)
        ? s + 's'
        : double0(s) + 's'
    const strArr = [hStr, mStr, sStr].filter(e => e)
    return strArr.join(' ')
}

function nowTimeStrFn(time) {
    const h = Math.floor(time / 1000 / 60 / 60)
    const m = Math.floor(time / 1000 / 60) % 60
    const s = Math.floor(time / 1000) % 60
    const mStr = double0(m)
    const sStr = double0(s)
    return `${h}:${mStr}:${sStr}`
}
