const User = require('./User')
const router = require('express').Router()
const { check, validationResult } = require('express-validator')
const bcrypt = require('bcrypt')
const Problem = require('./Problem')
const Solution = require('./Solution')

router.get('/amilogged', (req, res) => {
    if (req.session.name === undefined) res.send('nay')
    else res.send('ye')
})

router.get('/myname', (req, res) => {
    if (req.session.name) res.send(req.session.name)
    else res.sendStatus(404)
})

router.get('/amiadmin', (req, res) => {
    if (req.session.elevated === undefined) res.send('nay')
    else res.send('ye')
})

router.post('/users/create', [
    check('name').isString().trim().escape().not().isEmpty(),
    check('pswd').isString().not().isEmpty()
], async (req, res) => {
    console.log(`Received request to create new user. Name: ${req.body.name}, password: ${req.body.pswd[0]}...`)

    const oldUser = await User.findOne({ name: req.body.name });

    //User does already exist
    if (oldUser)
        return res.status(409).json({ msg: 'Bad username or password' })

    const user = new User({ name: req.body.name, pswdHash: bcrypt.hashSync(req.body.pswd, 10) });
    user.save((err) => {
        if (err) {
            console.error(err)
            res.sendStatus(500)
            return
        }
        //req.session.name = req.body.name
        //req.session.elevated = req.body.elevated <-- Naruszenie bezpieczeństwa, wtf, niech sam się loguje
        res.sendStatus(201)
    });
})

router.post('/login', [
    check('name').isString().not().isEmpty(),
    check('pswd').isString().not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    const user = await User.findOne({ name: req.body.name });

    //User does not exist
    if (!user)
        return res.status(401).json({ msg: 'Bad username or password' })

    //Wrong password
    if (!bcrypt.compareSync(req.body.pswd, user.pswdHash))
        return res.status(401).json({ msg: 'Bad username or password' })

    console.log('Logged in, user: ' + req.body.name + ', IP: ' + req.ip)
    req.session.name = req.body.name
    if(user.elevated)
        req.session.elevated = true

    res.status(200).json({ msg: 'Logged in' })
})

router.delete('/logout', (req, res) => {
    console.log(`Logged an user out: ${req.session.name}, IP: ${req.ip}`)
    req.session.destroy((err) => console.error(err))
    res.clearCookie('sprciacho')
    res.status(200).json({ msg: 'Logged out' })
})

router.post('/problems/add', [
    check('name').isString().not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }
    if (!req.session.elevated)
        return res.status(401).json({ msg: 'Not logged in as admin' })
    
    const problem = new Problem({ name: req.body.name })
    await problem.save((err) => {
        if (err) {
            console.error(err)
            res.sendStatus(500)
            return
        }
        console.log('problem ' + req.body.name + ' added')
        res.sendStatus(200)
    });
})

router.get('/problems/list', async (req, res) => {
    problems = await Problem.find({}, null, {sort: {name: 1}})
    return res.status(200).json(problems)
})

router.post('/submit',[
    check('problem').isString().not().isEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    if (req.session.name === undefined)
        return res.status(401).json({ msg: 'User not logged in' } )
    
    const problem = await Problem.findOne({ name: req.body.problem }).catch(err => {
        res.sendStatus(500)
    })
    if(!problem)
        return res.status(400).json({ msg: 'Problem does not exits' }) 
        
    const sol = new Solution( {
        user: req.session.name,
        problem: req.body.problem,
        time: new Date()
    })

    // temporarly just insert random result
    const results = ["WAITING", "OK", "BAD"]
    sol.result = results[Math.floor(Math.random()*results.length)]
    
    await sol.save((err) => {
        if (err) {
            console.error(err)
            res.sendStatus(500)
            return
        }
        console.log('Solution received from ' + req.session.name + ' for ' + req.body.problem)
        res.sendStatus(200)
    });
})

router.get('/ranking', async (req, res) => {
    
    const problems = (await Problem.find({}, null, {sort: {name: 1}})).map(x => x.name)
    const probInd = {}
    problems.forEach((value, index) => {
        probInd[value] = index
    })
    
    const solutions = await Solution.find({}, null, {sort: {date: 1}})

    let start = new Date('September 6, 2019 12:00:00');

    let ranking = {}
    for (solution of solutions) {
        if(solution.result != 'WAITING') {
            //add user if not in ranking
            if(ranking[solution.user] === undefined) {
                ranking[solution.user] = {
                    name: solution.user,
                    points: 0,
                    penalty: 0,
                    problems: Array(problems.length).fill().map(u => ({ time: 0, attempts: 0 }) )
                }
            }
            let userObj = ranking[solution.user]
            let problem = probInd[solution.problem]
            if(userObj.problems[problem].time === 0) {
                if(solution.result == 'BAD')
                    userObj.problems[problem].attempts += 1
                if(solution.result == 'OK') {
                    userObj.problems[problem].attempts += 1
                    userObj.problems[problem].time = solution.time - start
                    userObj.points += 1
                    userObj.penalty += userObj.problems[problem].time + (userObj.problems[problem].attempts - 1) * 20 * 60000
                }
            }
        }
    }

    let users = Object.values(ranking).sort((a, b) => {
        if(a.points == b.points) 
            return a.penalty - b.penalty
        else
            return b.points - a.points
    })

    return res.status(200).json({ problems: problems, users: users })
})

module.exports = router