const fs = require('fs')
require('dotenv').config();

const tmi = require('tmi.js');

const client = new tmi.Client({
    options: { debug: true },
    identity: {
        username: process.env.TWITCH_USERNAME,
        password: `oauth:${process.env.TWITCH_OAUTH}`
    },
    channels: [process.env.TWITCH_CHANNEL]
});

client.connect();

const double0 = str => ('0' + str).slice(-2)

const updateData = () => {
    let fIndex
    _data.forEach((e, i, a) => {
        if (i === 0 || fIndex !== undefined)
            return
        if (Date.now() > e.date.getTime())
            fIndex = i - 1
    })
    // if (!fIndex)
    //     fIndex = _data.length - 1
    _data = _data.slice(fIndex)
}

fs.mkdir('./data', { recursive: true }, (err) => {
    if (err) throw err;
});

let _data
try {
    const data = JSON.parse(fs.readFileSync('./data/_data.json'))
    _data = data.map(e => ({ ...e, date: new Date(e.date) }))

} catch (error) { console.log(error) }

client.on('message', function (channel, tags, message, self) {
    if (self || !message.startsWith('!')) return;

    const args = message.slice(1).split(' ');
    const command = args.shift().toLowerCase();

    if (command === 'echo') {
        client.say(channel, `@${tags.username}, you said: ${args.join(' ')}`);
    }
    if ((command === 'cmd' ||
        command === 'command' &&
        args[1] === 'edit' &&
        args[2] === 'time') ||
        command === 'test') {
        const listMsg = message.replace(/.*]/, '')
        const listArr = listMsg.split(' ⏩ ')
        const timeArr = listArr.map(e => e.match(/(?<=\()\d?\d:\d{2}(?=\))/)
            ?.toString()
            ?.split(':'))
            .filter(e => e)
        const dateArr = timeArr.map(e => {
            const [h, m] = e
            const date = new Date()
            date.setHours(h)
            date.setMinutes(m)
            if (date.getTime() < Date.now())
                date.setTime(date.getTime() + 24 * 60 * 60 * 1000)
            return date
        })
        let sliceIndex = 0
        dateArr.forEach((e, i, a) => {
            if (i === 0 || sliceIndex)
                return
            if (a[i - 1].getTime() > e.getTime())
                sliceIndex = i - 1
        })
        const a = dateArr.slice(0, sliceIndex)
            .map(e => {
                e.setTime(e.getTime() - 24 * 60 * 60 * 1000)
                return e
            })
            .concat(dateArr.slice(sliceIndex))
        let fIndex = 0
        // a.forEach((e, i, a) => {
        //     if (i === 0 || fIndex)
        //         return
        //     if (Date.now() > e.getTime())
        //         fIndex = i - 1
        // })
        const dateObjArr = dateArr.slice(fIndex)
        const titleObjArr = listArr.slice(fIndex)
            .map(e => e.replace(/\(\d?\d:\d{2}\).*/, '').trim())
        const dataArr = dateObjArr.map((date, i) => ({
            date,
            title: titleObjArr[i]
        }))
        _data = dataArr
        fs.writeFileSync('./data/_data.json', JSON.stringify(dataArr, null, 4))
    }
    if (command === 'next') {
        updateData()
        const e = _data[1]
        if (!e) {
            client.say(channel, `@${tags.username}, Next: eShrug `);
            return
        }
        const { title, date } = e
        const calcDate = date.getTime() - Date.now()
        const h = Math.floor(calcDate / 1000 / 60 / 60)
        const m = Math.floor(calcDate / 1000 / 60) % 60
        const s = Math.floor(calcDate / 1000) % 60
        const mStr = double0(m)
        const sStr = double0(s)
        client.say(channel, `@${tags.username}, Next: ${title} in ${h}h${mStr}m${sStr}s`);
        console.log(calcDate)
    }
    if (command === 'now') {
        updateData()
        const e = _data[0]
        console.log(_data)
        if (!e)
            return
        const { title, date } = e
        const calcDate = Date.now() - date.getTime()
        console.log(new Date, date);
        const h = Math.floor(calcDate / 1000 / 60 / 60)
        const m = Math.floor(calcDate / 1000 / 60) % 60
        const s = Math.floor(calcDate / 1000) % 60
        const mStr = double0(m)
        const sStr = double0(s)
        client.say(channel, `@${tags.username}, Now: ${title} (${h}h${mStr}m${sStr}s)`);
    }
    // console.log(...arguments)
});