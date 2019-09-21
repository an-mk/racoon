﻿#!/usr/bin/env node

const express = require('express')
const helmet = require('helmet')
const app = express()
const session = require('express-session')
const cryptoRandomString = require('crypto-random-string')
const fileUpload = require('express-fileupload')

const port = process.env.SPRPORT || process.env.PORT || 3000

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

app.use('/api', require('./api/users'))
app.use('/api', require('./api/problems'))

app.get('*', (_req, res) => res.sendFile(`${__dirname}/public/index.html`))

app.listen(port, () => console.log(`Running on port ${port}`))
