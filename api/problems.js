const router = require('express').Router()
const { check, validationResult } = require('express-validator')
const Problem = require('../models/Problem')
const Solution = require('../models/Solution')
const solutionQueue = require('../solutionQueue')



router.post('/problems/add', [
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

router.get('/problems/list', async (req, res) => {
    const problems = await Problem.find({}, null, { sort: { name: 1 } })
    return res.status(200).json(problems)
})

router.get('/solutions/:problem', [
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

router.post('/submit', [
    check('problem').isString().not().isEmpty(),
    check('code').isString().not().isEmpty()
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

    const sol = new Solution({
        user: req.session.name,
        problem: req.body.problem,
        code: req.body.code
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

router.get('/ranking', async (req, res) => {

    const problems = (await Problem.find({}, null, { sort: { name: 1 } })).map(x => x.name)
    const probInd = {}
    problems.forEach((value, index) => {
        probInd[value] = index
    })

    const solutions = await Solution.find({}, null, { sort: { date: 1 } })

    let start = new Date('September 8, 2019 9:00:00')

    let ranking = {}
    for (solution of solutions) {
        if (solution.result != 'WAITING') {
            //add user if not in ranking
            if (ranking[solution.user] === undefined) {
                ranking[solution.user] = {
                    name: solution.user,
                    points: 0,
                    penalty: 0,
                    problems: Array(problems.length).fill().map(u => ({ time: 0, attempts: 0 }))
                }
            }
            let userObj = ranking[solution.user]
            let problem = probInd[solution.problem]
            if (userObj.problems[problem].time === 0) {
                if (solution.result == 'BAD')
                    userObj.problems[problem].attempts += 1
                if (solution.result == 'OK') {
                    userObj.problems[problem].attempts += 1
                    userObj.problems[problem].time = solution.time - start
                    userObj.points += 1
                    userObj.penalty += userObj.problems[problem].time + (userObj.problems[problem].attempts - 1) * 20 * 60000
                }
            }
        }
    }

    let users = Object.values(ranking).sort((a, b) => {
        if (a.points == b.points)
            return a.penalty - b.penalty
        else
            return b.points - a.points
    })

    return res.status(200).json({ problems: problems, users: users })
})

module.exports = router