const router = require('express').Router()
const { check, validationResult } = require('express-validator')
const Problem = require('../models/Problem')
const Solution = require('../models/Solution')
const Lang = require('../models/Lang')
const solutionQueue = require('../solutionQueue')

router.get('/for/:problem', [
    check('problem').isString().not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() })
    }

    const solutions = await Solution.find({
        user: req.session.name,
        problem: req.params.problem
    }, null, { sort: { time: -1 } }).lean()

    solutions.forEach((solution) => {
        solution.time = new Date(solution.time).getTime()
    })

    return res.status(200).json(solutions)
})

router.get('/all', async (req, res) => {

    if (!req.session.elevated)
        return res.status(401).json({ msg: 'Not logged in as admin' })

    const solutions = await Solution.find({}, null, { sort: { time: -1 } }).lean()
    return res.status(200).json(solutions)
})

router.get('/my', async (req, res) => {
    return res.status(200).json(await Solution.find({ user: req.session.name }, null, { sort: { time: -1 } }))
})

router.post('/submit', [
    check('problem').isString().not().isEmpty(),
    check('code').isString().not().isEmpty(),
    check('lang').isString().not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() })
    }

    if (req.session.name === undefined)
        return res.status(401).json({ msg: 'User not logged in' })

    const problem = await Problem.findOne({ name: req.body.problem }).catch(err => {
        console.log(err)
        res.sendStatus(500)
    })
    if (!problem)
        return res.status(400).json({ msg: 'Problem does not exits' })

    const lang = await Lang.findOne({$or: [{ name: req.body.lang }, { monacoName: req.body.lang }]}).catch(err => {
            console.log(err)
            res.sendStatus(500)
    })
    if (!lang)
        return res.status(400).json({ msg: 'Programming Language does not exits' })

    const sol = new Solution({
        user: req.session.name,
        problem: req.body.problem,
        code: req.body.code,
        lang: req.body.lang
    })

    await sol.save((err) => {
        if (err) {
            console.error(err)
            res.sendStatus(500)
            return
        }

        console.log('Solution received from ' + req.session.name + ' for ' + req.body.problem)
        res.sendStatus(201)

        solutionQueue.push(sol)
    })
})

module.exports = router