const Problem = require('./models/Problem');
const CheckEnv = require('./models/CheckEnv.js')
const fs = require('fs')
const dockeranchor = require('./dockeranchor.js')
const File = require('./models/File.js')
const crypto = require('crypto')



const tmpDir =  process.env.RACOONTMPFILES || './tmp'

const { promisify } = require('util')
const asyncMkdir = promisify(fs.mkdir)
const asyncWriteFile = promisify(fs.writeFile)

async function insertProblem (name, content, checkEnv, checkCodeStream) {
    const problem = new Problem({ name: name, content: content, checkEnv: checkEnv });
    const isFound = await Problem.findOne({ name: checkEnv });

    const envInstance = await CheckEnv.findOne({ name: checkEnv })
    if (!envInstance) {
        console.log(envInstance)
        console.log('checkenv', checkEnv, 'not found')
        return [false, 'CheckEnv not found']
    }
    
    if(envInstance.usesBinary) {
        if(checkCodeStream === undefined) {
            return [false, 'no file stream']
        }

        const dirPath = tmpDir + '/' + crypto.randomBytes(8).toString('hex')
        await asyncMkdir(dirPath)
        const codePath = dirPath + '/code'
        const binaryPath = dirPath + '/binary'

        const writeStream = fs.createWriteStream(codePath)
        await new Promise(resolve => {
            writeStream.on('finish', resolve)
            checkCodeStream.pipe(writeStream)
        })
        
        try {
            await dockeranchor.compile(envInstance.compiler, codePath, binaryPath)
        } catch (err) {
            if(err[0] > 1) {
                throw err[1]
            }
            else {
                console.log('Compilation failed: ' + err[1])
                return [false, err[1]]
            }
        }

        const binStream = fs.createReadStream(binaryPath)
        const codeStream = fs.createReadStream(codePath)
        
        problem.checkCode = (await File.write('checkcode', codeStream))._id
        problem.checkBin = (await File.write('checkbin', binStream))._id
    }

    if (isFound) await Problem.deleteOne({ name: name })
        .then(() => console.log("Overrode Problem: " + name))
        .catch((err) => {
            console.log("Failed to override Problem: " + err)
            throw err
        });
    return await problem.save()
        .then(() => {
            console.log("Problem added.")
            return [true, 'OK']
        })
        .catch((err) => {
            console.log("Failed to add Problem to the database: " + err)
            throw err
        })
}

const remProblem = async (name) => {
	Problem.deleteOne({ name: name })
		.then(() => console.log("Problem deleted."))
		.catch((err) => console.log("Failed to delete Problem: " + err))
}

module.exports = { insertProblem, remProblem}