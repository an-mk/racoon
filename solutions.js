const Solution = require('./models/Solution')
const FunctionQueue = require('./utils/FunctionQueue')
const dockeranchor = require('./dockeranchor')
const fs = require('fs')
const crypto = require('crypto')
const Lang = require('./models/Lang')
const Problem = require('./models/Problem')
const Test = require('./models/Test')
const File = require('./models/File')
const { promisify } = require('util')
const tar = require('tar')
const rimraf = promisify(require('rimraf'))
const CheckEnv = require('./models/CheckEnv.js')

const writeFileAsync = promisify(fs.writeFile)
const mkdirAsync = promisify(fs.mkdir)
const readFileAsync = promisify(fs.readFile)
const accessAsync = promisify(fs.access)

const tmpDir = process.env.RACOONTMPFILES || './tmp'

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

    try {

        await accessAsync(tmpDir).catch(async (err) => {
            await mkdirAsync(tmpDir).catch(async (err) => {
                console.log('judge cant create dir ', err);
                throw err;
            })
        })
        const dirPath = tmpDir + '/' + crypto.randomBytes(8).toString('hex')
        const lang = await Lang.findOne({ name: solution.lang });
        if (!lang) console.error(`Lang ${solution.lang} not found.`)
        const problem = await Problem.findOne({ name: solution.problem });
        if (!problem) console.error(`Problem ${solution.problem} not found.`)

        await mkdirAsync(dirPath).catch(async (err) => {
            console.log('judge cant create dir ', err);
            throw err;
        })
        const codePath = dirPath + '/sol.code';
        await writeFileAsync(codePath, solution.code).catch(async (err) => {
            console.log('judge cant save file ', err);
            throw err;
        })

        await dockeranchor.compile(lang.compiler, codePath).catch(async err => {
            if (err[0] > 0) {
                console.log("Server error while compiling " + err[1]);
                await solution.updateOne({ result: 'Compile Server Error' });
            }
            else await solution.updateOne({ result: 'CE' })
            throw err
        }).then(async (compiledFile) => {
            console.log(compiledFile)

            var checkPath = dirPath + '/checkbin'

            const checkEnvInstance = await CheckEnv.findOne({ name: problem.checkEnv })
            if (checkEnvInstance.usesBinary) {
                File.toFile(problem.checkBin, checkPath)
            } else {
                checkPath = compiledFile
            }

            return new Promise(async (resolve, reject) => {
                try {
                    const testz = problem.tests;
                    for (let test of testz) {
                        console.log('Running test ' + test);

                        const testObj = await Test.findOne({ _id: test });
                        const testFile = testObj.file;

                        await File.toFile(testFile, `${dirPath}/${testFile}`);
                        await File.toFile(testObj.outFile, `${dirPath}/outFile.txt`)


                        var result = await dockeranchor.execEx(lang.execenv, compiledFile, `${dirPath}/${testFile}`, {},
                            { memLimit: problem.memLimit, timeLimit: problem.timeLimit })

                        await readFileAsync(result[0], 'utf8').then(console.log)
                        await readFileAsync(`${dirPath}/outFile.txt`, 'utf8').then(console.log)

                        try {
                            var result = await dockeranchor.execEx(checkEnvInstance.execEnv, checkPath, result[0], { good: `${dirPath}/outFile.txt` }, { timeLimit: problem.timeLimit })
                        } catch (err) {
                            if (err[0] === 0) {
                                throw [1, 'Checker error! ' + err[1]]
                            }
                            else throw err
                        }

                        console.log('finished check', result)

                        result = await readFileAsync(result[0], 'utf8')
                        console.log(result)

                        if (result.substr(0, 2) !== 'OK')
                            throw [0, 'Wrong anwser']


                    };

                    await solution.updateOne({ result: 'OK' })

                    resolve();

                } catch (err) {
                    if (err[0] > 0) {
                        console.log("Server error while executing " + err[1]);
                        await solution.updateOne({ result: 'Exec Server Error' });
                    }
                    else if (err[0] == 0) await solution.updateOne({ result: err[1] });
                    reject(err);
                }
            })
        }).catch(err => {
            console.log('Caught: ' + err)
        })
            .finally(async _ => {
                await rimraf(dirPath).catch(err => {
                    console.log('judge cant remove dir', err)
                    throw err
                })
            });
        console.log('Finished check for', solution.user, solution.problem)
    } catch (err) {
        console.log('error while judgeing', err)
    }
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
