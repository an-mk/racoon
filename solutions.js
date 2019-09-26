const Solution = require('./models/Solution')
const FunctionQueue = require('./utils/FunctionQueue')
const dockeranchor = require('./dockeranchor')
const fs = require('fs')
const crypto = require('crypto')
const Lang = require('./models/Lang')
const { promisify } = require('util')
const tar = require('tar')
const rimraf = promisify(require('rimraf'))

const writeFileAsync = promisify(fs.writeFile)
const mkdirAsync = promisify(fs.mkdir)

const tmpDir =  process.env.RACOONTMPFILES || './tmp'

const solutionQueue = new FunctionQueue(judge, 2)

async function insertSolution(user, problem, code, lang) {
    const sol = new Solution({
        user: user,
        problem: problem,
        code: code,
        lang: lang
    })

    await sol.save((err) => {
        if (err) {
            throw err
        }
        console.log('Solution saved from ' + user + ' for ' + problem)
        solutionQueue.push(sol)
    })
}

async function judge(solution) {
    console.log('Started check for', solution.user, solution.problem)

    const dirPath = tmpDir + '/' + crypto.randomBytes(8).toString('hex')

    const lang = await Lang.findOne({ name: solution.lang })

    await mkdirAsync(dirPath).catch(async (err) => {
        console.log('judge cant create dir ', err);
        throw err;
    })
    const codePath = dirPath + '/sol.code';
    await writeFileAsync(codePath, solution.code).catch(async (err) => {
        console.log('judge cant save file ', err);
        throw err;
    })

    await dockeranchor.compile(lang.compiler, codePath).then( async (res) => {
        await tar.extract({ file: dirPath + '/sol.tar', C: dirPath })

        //still random
        await new Promise(resolve => setTimeout(resolve, 10000))
        await solution.updateOne({ result: (Math.random() > 0.7) ? "OK" : "BAD" })
    }).catch( async (err) => {
        await solution.updateOne({ result: 'CE' })
    })

    await rimraf(dirPath).catch(err => {
        console.log('judge cant remove dir', err)
        throw err
    })

    console.log('Finished check for', solution.user, solution.problem)
}

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

module.exports = { insertSolution }
