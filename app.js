// const fs = require('fs')
require('dotenv').config();
const emojiRegexFn = require('emoji-regex');

const tmi = require('tmi.js');
const { channel } = require('tmi.js/lib/utils');

const channels = [process.env.TWITCH_CHANNEL]

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
        fIndex = 0
    timeList = timeList.slice(fIndex)
    if (timeList.length !== startList.length) {
        console.log('Before: ', startList)
        console.log('After: ', timeList)
    }
}

const commandsStr = `Commands: !now, !next, !skip, !pyramid and !commands. Mod commands: !pyramid-cd <minutes>`

// fs.mkdir('./data', { recursive: true }, (err) => {
//     if (err) throw err;
// });

let timeList = []

let timeoutList = []

let pyramidCooldown = minToMs(2)
let lastPyramid = new Date(Date.now() - pyramidCooldown)
// try {
//     const data = JSON.parse(fs.readFileSync('./data/timeList.json'))
//     timeList = data.map(e => ({ ...e, date: new Date(e.date) }))
// } catch (error) { console.error(error) }

const nameRegex = new RegExp(`^@?${process.env.TWITCH_USERNAME}$`)
const emojiRegex = emojiRegexFn();

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
    if (self || !(
        message.startsWith('!') ||
        message.startsWith(process.env.TWITCH_USERNAME) ||
        message.startsWith(`@${process.env.TWITCH_USERNAME}`))) return;

    const args = message.split(' ');
    const command = args.shift()
        .toLowerCase()
        .replace(/,?$/, '');

    const log = () => {
        // const msgDate = new Date(parseInt(tags['tmi-sent-ts'])).toJSON()
        // console.log(`${msgDate} ${tags['display-name']}: ${message}`)
    }

    const isMod = tags.mod ||
        tags?.badges?.broadcaster === '1'

    if (((command === '!cmd' ||
        command === '!command') &&
        args[0] === 'edit' &&
        args[1] === 'time') ||
        command === '!list') {
        if (!isMod)
            return
        const listMsg = message.slice(message.indexOf(']') + 1)
        const arr = listMsg.split(' ⏩ ')
        const utc = message.match(/UTC\+(-?\d+)]/)?.[1] || 0
        const a = arr.map(e => e.split(/(?=\(\d\d?:\d{2}\))/))
        const b = a.map(e => {
            const time = e[1]?.slice(1, -1) || '0:00'
            const title = e[0].trim()
            return { title, time }
        })
        log();
        const dayInMs = 24 * 60 * 60 * 1000
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
        else if (dTime < now - 12 * 60 * 60 * 1000)
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
            client.say(hostChannel, `!settitle 🧽 ${e.title} - Baj movies`);
        }, e.date.getTime() - Date.now()))
        client.say(channel, `Loaded ${c.length} items.`);
        // fs.writeFileSync('./data/timeList.json', JSON.stringify(c, null, 4))
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
        if (args[0] && !args[0].match(/^[+=!@/]/)) {
            const nowDate = new Date()
            const t = nowDate.getTime() - lastPyramid.getTime();
            if (t > pyramidCooldown) {
                if (Math.random() < .3) {
                    const copiumMsg = `@${tags['display-name']} Better luck next time Sadeg`
                    client.say(channel, `!band ${tags.username}`)
                    client.say(channel, copiumMsg)
                    return
                }
                lastPyramid = nowDate
                const text = args[0]
                const msg = text.match(emojiRegex)?.[0] || text
                pyramidFn(channel, tags, msg)
            } else {
                client.say(channel, `@${tags['display-name']}, !pyramid on cooldown (${Math.floor(t / 1000)}s/${pyramidCooldown / 1000}s)`)
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
        client.say(channel, `@${tags['display-name']}, ${commandsStr}`)
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
});

async function pyramidFn(channel, tags, msg) {
    const fn = str => client.say(channel, str)
    fn(msg)
    fn(`${msg} `.repeat(2))
    fn(`${msg} `.repeat(3))
    fn(`${msg} `.repeat(2))
    fn(msg)
}

channels.forEach(channel => {
    setInterval(() => {
        client.say(channel, commandsStr)
    }, 60 * 60 * 1000)
})

function minToMs(num) {
    return num * 60 * 1000
}
