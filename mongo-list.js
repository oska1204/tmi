require('dotenv').config()
const fetch = require("node-fetch");
const { JSDOM } = require('jsdom');

/** 1) Install & Set up mongoose */
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);

/** 2) Create a 'Watchlist' Model */
var watchlistSchema = new mongoose.Schema({
    day: String,
    date: String,
    order: Number,
    title: String,
    year: Number,
    score: String,
    mm: Number,
    hhmm: String,
    id: String,
    total: Number,
    old: String,
});

/** 3) Create and Save a Watchlist */
var Watchlist = mongoose.model('watchlist', watchlistSchema);

async function mongoList(msg, say) {
    const list = msg.split('⏩')
        .map(e => e.trim())
    list.pop()
    if (typeof list[0] === 'string')
        list[0] = list[0].replace(/[A-Z]{3} - /, '')
    const now = new Date
    const date = [
        now.getUTCDate(),
        now.getUTCMonth() + 1,
        now.getUTCFullYear()
    ].join('/')
    const dbList = await Watchlist.find({ date }).sort({ total: -1 })
    if (dbList.length <= list.length &&
        list.length !== 0) {
        say('Generating watchlist...')
        await Watchlist.deleteMany({ date })
        const count = await Watchlist.count()
        const newList = await createList(list, count, date, now)
        await Watchlist.create(newList)
        say('Updating watchlist...')
        fetch(process.env.NETLIFY_BUILD_URI, { method: 'post' })
    }
    console.log(await Watchlist.count())
}

async function createList(list, count, date, now) {
    const arr = list.map((title, i) => {
        return {
            title,
            total: count + i + 1,
            order: i + 1,
            date,
            day: getDay(now),
        }
    })
    for (const obj of arr) {
        try {
            const { title } = obj
            const baseUrl = 'https://duckduckgo.com/?q=\\'
            const search = encodeURIComponent(`${title} site:imdb.com/title`)
            const html = await getDocument(baseUrl + search)
            const dom = new JSDOM(html)
            const doc = dom.window.document
            const docTitle = doc.querySelector('head title').textContent.trim()
            const elm = doc.querySelector('script[type="application/ld+json"]')
            const json = JSON.parse(elm.textContent)
            const year = docTitle.match(/(\d+)\) - IMDb/)?.[1]
            const th = json.duration.match(/(\d+)H/)?.[1]
            const tm = json.duration.match(/(\d+)M/)?.[1]
            const [h, m] = [th, tm].map(e => {
                const num = parseInt(e)
                if (Number.isNaN(num))
                    return 0
                else
                    return num
            })
            const mm = h * 60 + m
            const mStr = ('0' + m).slice(-2)
            const hhmm = `${h}:${mStr}`
            const score = json.aggregateRating.ratingValue * 10 + '%'
            const id = json.url.match(/tt\d{7,}/)?.toString()
            Object.assign(obj, {
                year,
                mm,
                hhmm,
                score,
                id,
                old: title,
                title: json.name,
            })
        } catch (error) {
            console.error(error)
        }
    }
    return arr
}

function getDay(now) {
    switch (now.getUTCDay()) {
        case 0:
            return 'SUNDAY'
        case 1:
            return 'MONDAY'
        case 2:
            return 'TUESDAY'
        case 3:
            return 'WEDNESDAY'
        case 4:
            return 'THURSDAY'
        case 5:
            return 'FRIDAY'
        case 6:
            return 'SATURDAY'
    }
}

async function getDocument(url) {
    let urlO
    const html = await fetch(url).then(e => {
        urlO = new URL(e.url)
        return e.text()
    })
    const dom = new JSDOM(html)
    const doc = dom.window.document
    const elm = doc.querySelector('[http-equiv="refresh"]')
    if (elm) {
        const a = elm.getAttribute('content')
        const b = a.split(';').filter(e => e.match(/^\s*?url=/i))[0]
        let c = b.replace(/^\s*?url=/i, '')
        if (c[0] === '/')
            c = urlO.origin + c
        return await getDocument(c)
    }
    return doc.documentElement.innerHTML
}

module.exports = {
    mongoList,
    createList
}
