require('dotenv').config()
const fetch = require("node-fetch");
const { JSDOM } = require('jsdom');
const fs = require('fs')

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

let currentId

const d0 = str => {
    str = str.toString()
    if (str.length === 1)
        return '0' + str
    return str
}

async function mongoList(msg, say = console.log) {
    const currentIdTemp = Date.now()
    currentId = currentIdTemp
    const list = msg.split('⏩')
        .map(e => e.trim())
    list.pop()
    if (typeof list[0] === 'string')
        list[0] = list[0].replace(/^[A-Z]{3} - /, '')
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
        const newList = await createList(
            list,
            count,
            date,
            now,
            currentIdTemp,
        )
        if (currentId === currentIdTemp) {
            await Watchlist.create(newList)
            say('Updating watchlist...')
            fetch(process.env.NETLIFY_BUILD_URI, { method: 'post' })
        }
    }
    console.log(await Watchlist.count())
}

async function createList(list, count, date, now, currentIdTemp) {
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
        if (currentId !== currentIdTemp)
            break
        await wait()
        try {
            await searchFn(obj);
        } catch (error) {
            console.error(error)
        }
    }

    return arr
}

async function searchFn(obj) {
    const { title } = obj;
    const matchEpisodeObj = matchEpisode(title.trim());
    let seriesJson = {}
    const { t, s, e } = matchEpisodeObj || {};
    if (matchEpisodeObj) {
        seriesJson = await getEpisode(t, s, e) || {};
    }
    const { imdbID, seriesID } = seriesJson
    let url;
    let seriesTitle
    if (imdbID) {
        const baseUrl = 'https://www.imdb.com/title/';
        url = baseUrl + imdbID;
        seriesTitle = await getTitle(seriesID);
        seriesTitle += ` S${d0(s)}E${d0(e)}`
    } else {
        const baseUrl = 'https://duckduckgo.com/?q=\\';
        const search = encodeURIComponent(`${title} movie site:imdb.com/title`);
        url = baseUrl + search;
    }
    const html = await getDocument(url);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const docTitle = doc.querySelector('head title').textContent.trim();
    const elm = doc.querySelector('script[type="application/ld+json"]');
    const json = JSON.parse(elm.textContent);
    const year = docTitle.match(/(\d+)\) - IMDb/)?.[1];
    const th = json.duration?.match(/(\d+)H/)?.[1];
    const tm = json.duration?.match(/(\d+)M/)?.[1];
    const [h, m] = [th, tm].map(e => {
        const num = parseInt(e);
        if (Number.isNaN(num))
            return 0;

        else
            return num;
    });
    let mm = h * 60 + m;
    const mStr = ('0' + m).slice(-2);
    let hhmm = `${h}:${mStr}`;
    if (mm === 0) {
        mm = null
        hhmm = null
    }
    const { ratingValue } = json.aggregateRating || {};
    let score;
    if (ratingValue)
        score = ratingValue * 10 + '%';
    const id = json.url.match(/tt\d{7,}/)?.toString();
    const titleText = await getTitle(id);
    Object.assign(obj, {
        year,
        mm,
        hhmm,
        score,
        id,
        old: title,
        title: imdbID ? seriesTitle : titleText,
    });
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

async function getDocument(url, isNo) {
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
        if (!c.match(/\/title\/tt\d{7,}\/?$/) && !isNo)
            c = c.replace(/(?<=\/title\/tt\d{7,}\/?).*/, '')
        return await getDocument(c)
    }
    return doc.documentElement.innerHTML
}

async function getEpisode(search, season, episode) {
    let id, sid
    const baseUrl = 'https://duckduckgo.com/?q=\\';
    const s = encodeURIComponent(`${search} series site:imdb.com/title`);
    const u = baseUrl + s;
    const h = await getDocument(u)
    const dom2 = new JSDOM(h);
    const doc2 = dom2.window.document;
    const elm = doc2.querySelector('script[type="application/ld+json"]');
    const json = JSON.parse(elm.textContent);
    sid = json.url.match(/tt\d{7,}/)?.toString();
    const html = await getDocument(`https://www.imdb.com/title/${sid}/episodes?season=${season}`, true)
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    id = doc.querySelector(`[itemprop="episodeNumber"][content="${episode}"] ~ strong a`)
        .href
        .match(/tt\d+/)
        .toString()
    await wait()
    return { imdbID: id, seriesID: sid }
}

function matchEpisode(str) {
    let match = str.match(/(?<t>.+)s(?<s>\d{2})e(?<e>\d{2,})$/i)
    if (!match)
        match = str.match(/(?<t>.+)episode (?<e>\d+)/i)
    if (match) {
        const { t, s = 1, e } = match.groups
        return {
            t: t.trim(),
            s: parseInt(s),
            e: parseInt(e),
        }
    }
}

async function getTitle(id) {
    id = id.replace(/t+/, 'tt')
    const json = await fetch(`https://www.omdbapi.com/?apikey=80bf610a&i=${id}`)
        .then(e => e.json())
    return json.Title
}

function wait(seconds = 10) {
    return new Promise(res => setTimeout(res, seconds * 1000))
}

module.exports = {
    mongoList,
    createList,
    searchFn,
    Watchlist
}
