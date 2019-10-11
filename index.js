#!/usr/bin/env node

const express = require('express')
const helmet = require('helmet')
const app = express()
const session = require('express-session')
const cryptoRandomString = require('crypto-random-string')
const fileUpload = require('express-fileupload')

const port = process.env.RACOONPORT || process.env.PORT || 3000

app.use(helmet())

app.use(session({
    name: 'sprciacho',
    secret: cryptoRandomString({ length: 10 }),
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: true }
}))

app.use(fileUpload({
    useTempFiles : true,
    tempFileDir : '/tmp/'
}));

app.use('/', express.static(`${__dirname}/public`))
app.get('/', (_req, res) => res.sendFile(`${__dirname}/public/index.html`))
app.use(express.json())

app.use('/api/users', require('./api/users'))
app.use('/api/problems', require('./api/problems'))
app.use('/api/ranking', require('./api/misc'))
app.use('/api/solutions', require('./api/solutions'))
app.use('/api/me', require('./api/me'))
app.use('/api/session', require('./api/session'))
app.use('/api', require('./api/misc'))

app.get('*', (_req, res) => res.sendFile(`${__dirname}/public/index.html`))

app.listen(port, () => console.log(`Running on port ${port}`))
