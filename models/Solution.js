const db = require('../db.js')

const Solution = db.model('Solution', {
    user: { type: String, required: true },
    problem: { type: String, required: true },
    time: { type: Date, required: true, default: Date.now },
    result: { type: String, required: true, default: "WAITING" },
    code: { type: String, required: true }
})

module.exports = Solution;