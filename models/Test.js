
const db = require('../db')
const fs = require('fs')

const testSchema = db.Schema({
    problem: { type: String, required: true },
    file: { type: db.ObjectId, required: true },
    name: { type: String }
})
testSchema.index({ problem: 1 })

const Test = db.model('Test', testSchema)

module.exports = Test