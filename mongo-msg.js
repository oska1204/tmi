require('dotenv').config()

/** 1) Install & Set up mongoose */
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);

/** 2) Create a 'Watchlist' Model */
var msgSchema = new mongoose.Schema({
    channel: String,
    msg: String,
    date: Date,
});

/** 3) Create and Save a Watchlist */
var Msg = mongoose.model('msg', msgSchema);

let arr = []

async function mongoMsg(channel, tags, msg) {
    arr.push({
        channel,
        msg,
        date: tags['tmi-sent-ts']
    })
    if (arr.length >= 50) {
        await Msg.create(arr)
        arr = []
    }
}

module.exports = { mongoMsg }
