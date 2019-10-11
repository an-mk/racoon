const db = require('../db.js')

const Problem = db.model('Problem', {
    name: { type: String, required: true },
    content: { type: String, required: true },
    timeLimit: { type: Number, required: true, default: 2000 },
    memLimit: { type: Number, required: true, default: 256 },
    tests: { type: [] },
    checkEnv: { type: String, required: true },
    checkBin: { type: db.ObjectId },
    checkCode: { type: db.ObjectId }
})

module.exports = Problem;