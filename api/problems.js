const router = require('express').Router()
const { check, validationResult } = require('express-validator')
const Problem = require('../models/Problem')
const { createReadStream } = require('fs');
const tests = require('../tests')

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

router.post('/addtest/:problem', [
    check('problem').isString().not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() })
    }
    if (!req.files || !('test' in req.files))
        return res.status(422).json({ msg: 'File not send' })
    if (!req.session.elevated)
        return res.status(401).json({ msg: 'Not logged in as admin' })
    
    const problem = Problem.findOne({ name: req.params.problem }).catch(err => {
        console.log(err)
        res.sendStatus(500)
    })
    if(!problem)
        return res.status(400).json({ msg: 'Problem not found' })

    const stream = createReadStream(req.files.test.tempFilePath)
    
    tests.insertTest(req.params.problem, stream).then(r => {
        res.sendStatus(200)
    }).catch(err => {
        console.log(err)
        res.status(500).json({ err: err })
    })
})

router.get('/list', async (req, res) => {
    const problems = await Problem.find({}, null, { sort: { name: 1 } }).lean()
    return res.status(200).json(problems)
})


module.exports = router
