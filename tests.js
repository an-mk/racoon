const Problem = require('./models/Problem')
const Test = require('./models/Test')
const File = require('./models/File')

const { createModel } = require('mongoose-gridfs');

async function insertTest(problem, fileStream, outFileStream) {
    file = await File.write('test_' + problem, fileStream).catch(err => {
        console.log('test upload to database error')
        throw err
    })
    outFile = await File.write('test_' + problem + '_out', outFileStream).catch(err => {
        console.log('test upload to database error')
        throw err
    })

    const test = await Test.create({ problem: problem, file: file._id, outFile: outFile._id })
    let problemDocument = await Problem.findOneAndUpdate({ name: problem }, { '$push': { 'tests': test._id } })
    if (problemDocument === null) {
        await Test.deleteOne({ _id: test._id });
        throw 'Problem ' + problem + ' not found';
    }
    console.log('test for problem', problem, 'saved')
}

async function toFile(testId, path) {
    const test = await Test.findOne({ _id: testId })
    await File.toFile(test.file, path)
}

async function getTestStream(testId) {
    const test = await Test.findOne({ _id: testId })
    return File.getStream(test.file)
}

async function outToFile(testId, path) {
    const test = await Test.findOne({ _id: testId })
    await File.toFile(test.outFile, path)
}

async function getOutStream(testId) {
    const test = await Test.findOne({ _id: testId })
    return File.getStream(test.outFile)
}

async function remTest(testId) {
    testObj = await Test.findOne( { _id: testId } )
    const fileId = testObj.file

    await File.unlink({ fileId })
    await Problem.findOneAndUpdate( { name: testObj.problem }, { $pull: { tests: testId } })
    await Test.deleteOne( { _id: testId } )
}

module.exports = { Test, insertTest, remTest, toFile, getTestStream, outToFile, getOutStream }