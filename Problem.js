const db = require('./db.js')

const Problem = db.model('Problem', {
    name: { type: String, required: true }
})

module.exports = Problem;