const router = require('express').Router()

router.get('/amilogged', (req, res) => {
    if (req.session.name === undefined) res.send('nay')
    else res.send('ye')
})

router.get('/myname', (req, res) => {
    if (req.session.name) res.send(req.session.name)
    else res.sendStatus(404)
})

router.get('/amiadmin', (req, res) => {
    if (req.session.elevated === undefined) res.send(false)
    else res.send(true)
})

module.exports = router