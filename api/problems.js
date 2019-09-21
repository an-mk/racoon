const router = require('express').Router()
const { check, validationResult } = require('express-validator')
const Problem = require('../models/Problem')

router.post('/add', [
    check('name').isString().not().isEmpty(),
    check('content').isString().not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() })
    }
    if (!req.session.elevated)
        return res.status(401).json({ msg: 'Not logged in as admin' })

    const problem = new Problem({ name: req.body.name, content: req.body.content })
    await problem.save((err) => {
        if (err) {
            console.error(err)
            res.sendStatus(500)
            return
        }
        console.log('problem ' + req.body.name + ' added')
        res.sendStatus(200)
    })
})

router.get('/list', async (req, res) => {
    const problems = await Problem.find({}, null, { sort: { name: 1 } })
    return res.status(200).json(problems)
})


module.exports = router