const Solution = require('./models/Solution')
const FunctionQueue = require('./utils/FunctionQueue')


const checkSolution = async (solution) => {
    console.log('Started check for', solution.user, solution.problem)
    await new Promise(resolve => setTimeout(resolve, 10000))
    await solution.updateOne({ result: (Math.random() > 0.7) ? "OK" : "BAD" })
    console.log('Finished check for', solution.user, solution.problem)
}

const solutionQueue = new FunctionQueue(checkSolution, 2)

// restore queue from database
setTimeout(() => {
    Solution.find({ result: "WAITING" }, null, { sort: { time: 1 } }).then((res) => {
        for (sol of res) {
            solutionQueue.push(sol)
        }
    }).catch((err) => {
        console.log('could not restore queue')
        console.log(err)
        process.exit(1)
    })
}, 0)

module.exports = solutionQueue
