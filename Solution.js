const db = require('./db.js')

const Solution = db.model('Solution', {
    user: { type: String, required: true },
    problem: { type: String, required: true },
    time: { type: Date },
    result: { type: String, required: true, default: "WAITING" },
})

module.exports = Solution;