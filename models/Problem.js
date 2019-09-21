const db = require('../db.js')

const Problem = db.model('Problem', {
    name: { type: String, required: true },
    content: { type: String, required: true },
    timeLimit: { type: Number, required: true, default: 2000 },
    memLimit: { type: Number, required: true, default: 256 },
    tests: { type: [] }
})

module.exports = Problem;