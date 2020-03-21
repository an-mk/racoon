const router = require('express').Router()
const Problem = require('../models/Problem')
const Solution = require('../models/Solution')

router.get('/', async (req, res) => {

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