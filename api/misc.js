const router = require('express').Router()
const Lang = require('../models/Lang')
const CheckEnv = require('../models/CheckEnv')

router.get('/languages', async (req, res) => {
    const langs = await Lang.find({}, null, { sort: { name: 1 } }).lean()
    return res.status(200).json(langs)
})

router.get('/checkenvs', async (req, res) => {
    const checkenvs = await CheckEnv.find({}, null, { sort: { name: 1 } }).lean().select('name -_id')
    return res.status(200).json(checkenvs)
})

module.exports = router