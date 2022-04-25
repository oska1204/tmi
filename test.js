const jsdom = require('jsdom');
const fetch = require("node-fetch");

fetch(`https://www.streamelements.com/${TWITCH_CHANNEL}/commands`)
    .then(res => res.text())
    .then(html => {
        const dom = new JSDOM(html)
        const doc = dom.window.document
        Array.from(doc.querySelectorAll('td'))
            .find(e => e.textContent.trim() === '!time')
            .nextElementSibling
            .textContent
    })