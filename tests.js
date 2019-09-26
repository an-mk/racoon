const Problem = require('./models/Problem')
const Test = require('./models/Test')

const { createModel } = require('mongoose-gridfs');

async function insertTest(problem, fileStream) {
    const TestFile = await createModel({
        modelName: 'TestFiles'
    })
    await TestFile.write({ filename: 'test_' + problem, contentType: 'text/plain' }, fileStream, async (error, file) => {
        if(error) {
            console.log('test upload to database error')
            throw new Error(error)
        }
        else {
            const test = await Test.create({ problem: problem, file: file._id })
            await Problem.findOneAndUpdate({ name: problem }, { '$push': { 'tests': test._id } })
            console.log('test for problem', problem, 'saved')
        }
    })
}

async function getTestStream(testId) {
    const TestFile = await createModel({
        modelName: 'TestFiles'
    })
    const fileId = Test.findOne(testId).file
    return TestFile.read({ fileId })
}

async function remTest(testId) {
    testObj = Test.findOne( { _id: testID } )
    const fileId = testObj.file
    const TestFile = await createModel({
        modelName: 'TestFiles'
    })
    TestFile.unlink({ fileId })
    Problem.findOneAndUpdate( { name: testObj.problem }, { $pull: { tests: testId } })
    Test.deleteOne( { _id: testId } )
}

module.exports = { Test, insertTest, remTest, getTestStream }