// const fs = require('fs')
require('dotenv').config();

const tmi = require('tmi.js');

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
    let fIndex = timeList.findIndex(e => e.date.getTime() > Date.now()) - 1
    if (fIndex < 0)
        fIndex = 0
    timeList = timeList.slice(fIndex)
}

// fs.mkdir('./data', { recursive: true }, (err) => {
//     if (err) throw err;
// });

let timeList

const pyramidCooldown = minToMs(1)
let lastPyramid = new Date(Date.now() - pyramidCooldown)
// try {
//     const data = JSON.parse(fs.readFileSync('./data/timeList.json'))
//     timeList = data.map(e => ({ ...e, date: new Date(e.date) }))
// } catch (error) { console.error(error) }

const nameRegex = new RegExp(`^@?${process.env.TWITCH_USERNAME}$`)

client.on('message', function (channel, tags, message, self) {
    if (self || !(
        message.startsWith('!') ||
        message.startsWith(process.env.TWITCH_USERNAME) ||
        message.startsWith(`@${process.env.TWITCH_USERNAME}`))) return;

    const args = message.split(' ');
    const command = args.shift()
        .toLowerCase()
        .replace(/,?$/, '');

    if (((command === '!cmd' ||
        command === '!command') &&
        args[0] === 'edit' &&
        args[1] === 'time') ||
        command === 'test') {
        const listMsg = message.slice(message.indexOf(']') + 1)
        const arr = listMsg.split(' ⏩ ')
        const utc = message.match(/UTC\+(-?\d+)]/)?.[1] || 0
        const a = arr.map(e => e.split(/(?=\(\d\d?:\d{2}\))/))
        const b = a.map(e => {
            const time = e[1].slice(1, -1)
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
            return { ...e, date }
        })
        timeList = c
        client.say(channel, `Loaded ${c.length} items.`);
        // fs.writeFileSync('./data/timeList.json', JSON.stringify(c, null, 4))
    }
    if (command === '!next') {
        log()
        if (!timeList)
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
        if (!timeList)
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
        if (args[0] === 'amongE') {
            log()
            client.say(channel, `AMOGUS haHAA I'M IRONIC haHAA I'M NOT AN AMONG US NORMIE BTW haHAA`)
        }
        if (args[0] === 'GETALIFE') {
            log()
            client.say(channel, `Who is ${tags['display-name']} talking to LULE`)
        }
    }
    if (command === '!pyramid') {
        if (args[0] &&
            !args[0].match(/^[+=!@]/) &&
            lastPyramid.getTime() + pyramidCooldown < Date.now()) {
            lastPyramid = new Date()
            pyramidFn(channel, args[0])
        }
    }

    function log() {
        console.log(`${new Date().toJSON()} ${tags['display-name']}: ${message}`)
    }
});

async function pyramidFn(channel, msg) {
    const fn = str => {
        return new Promise(res => {
            client.say(channel, str)
            setTimeout(res, 1250)
        })
    }
    await fn(msg)
    await fn(`${msg} `.repeat(2))
    await fn(`${msg} `.repeat(3))
    await fn(`${msg} `.repeat(2))
    await fn(msg)
}

channels.forEach(channel => {
    setInterval(() => {
        client.say(channel, 'Commands: !next and !now')
    }, 60 * 60 * 1000)
})

function minToMs(num) {
    return num * 60 * 1000
}