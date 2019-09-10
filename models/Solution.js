const db = require('../db.js')

const solutionSchema = db.Schema({
    user: { type: String, required: true },
    problem: { type: String, required: true },
    time: { type: Date, required: true, default: Date.now },
    result: { type: String, required: true, default: "WAITING" },
    code: { type: String, required: true }
})
solutionSchema.index({ status: 1, time: 1 })
solutionSchema.index({ time: 1 })
solutionSchema.index({ user: 1, time: 1 })

const Solution = db.model('Solution', solutionSchema)

Solution.on('index', function(error) {
    if (error)
        console.log(error);
});

module.exports = Solution;
