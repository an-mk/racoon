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

    const lang = await Lang.findOne({ name: solution.lang });
    const problem = await Problem.findOne({ name: solution.problem });

    await mkdirAsync(dirPath).catch(async (err) => {
        console.log('judge cant create dir ', err);
        throw err;
    })
    const codePath = dirPath + '/sol.code';
    await writeFileAsync(codePath, solution.code).catch(async (err) => {
        console.log('judge cant save file ', err);
        throw err;
    })

    await (async () => { 
        return new Promise(async (resolve, reject)=>{
            try{
                await dockeranchor.compile(lang.compiler, codePath)
                var compiledFile;
                await tar.list({file : dirPath + '/sol.tar', onentry: entry => {compiledFile = entry.path}});
                await tar.extract({ file: dirPath + '/sol.tar', C: dirPath });
                resolve(compiledFile);
            }catch(err){
                if(err[0] > 0){
                    console.log("Server error while compiling "+ err[1]);
                    await solution.updateOne({ result: 'Compile Server Error' });
                }
                else await solution.updateOne({ result: 'CE' })
                reject(err);
            }
        }) 
    })()
    .then((compiledFile)=>{
        return new Promise(async (resolve, reject)=>{
            try{
                const testz = problem.tests;
                for(let test of testz){
                    console.log('Running test '+test);

                    const testObj = await Test.findOne({_id: test});
                    const testFile = testObj.file;

                    await File.toFile(testFile, `${dirPath}/${testFile}`);
        
                    var result = await dockeranchor.exec(lang.execenv, `${dirPath}/${compiledFile}`,  `${dirPath}/${testFile}`);
                    //still random
                    
                    console.log(result);

                    //await new Promise(resolve => setTimeout(resolve, 10000))
                    await solution.updateOne({ result: (Math.random() > 0.7) ? "OK" : "BAD" })
                };

                resolve();
            
            }catch(err){
                        if(err[0] > 0){
                            console.log("Server error while executing "+ err[1]);
                            await solution.updateOne({ result: 'Exec Server Error' });
                        }
                        else if(err[0] == 0)await solution.updateOne({ result: err[1] });
                        reject(err);
            }
        })
    })
    .catch(err => {
        console.log('Caught: '+err)
    })
    .finally(async _=>{
        await rimraf(dirPath).catch(err => {
            console.log('judge cant remove dir', err)
            throw err
        })
    });

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
