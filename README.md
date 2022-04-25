# Documentation

## Requirements

Rename `template.env` to `.env`, 
and fill out the values.
`TWITCH_CHANNEL_DEV` is not needed, but the others are.

You can generate a oauth [here](https://twitchapps.com/tmi/)

You need node.js, [download](https://nodejs.org/en/)

## Running the app

open `start.bat`,
or in project direcory run `npm run start`

for development run `npm run watch`, or `npm run dev` if you have a `TWITCH_CHANNEL_DEV` set

I have it curently hosted on heroku, might change.

All you need to do, if you also want to host it on heroku, is create an app, and navigate to
https://dashboard.heroku.com/apps/<your-app>/deploy for deploy methods.

Remember to add the `.env` values to https://dashboard.heroku.com/apps/<your-app>/settings config vars and under https://dashboard.heroku.com/apps/<your-app>/resources enable worker, and disable web.
